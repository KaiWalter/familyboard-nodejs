{
  description = "Developer shell for the Photo & Calendar SPA";

  inputs.nixpkgs.url = "nixpkgs/nixos-unstable";

  outputs = {
    self,
    nixpkgs,
  }: let
    systems = ["x86_64-linux" "aarch64-linux"];
    forAllSystems = nixpkgs.lib.genAttrs systems;
    mkPkgs = system:
      import nixpkgs {
        inherit system;
        config.allowUnfree = true;
      };
  in {
    formatter = forAllSystems (
      system: let
        pkgs = mkPkgs system;
      in
        pkgs.alejandra
    );

    devShells = forAllSystems (
      system: let
        pkgs = mkPkgs system;
        shell = pkgs.mkShell {
          packages = [
            pkgs.uv
            pkgs.nodejs_22
            pkgs.jq
          ];

          shellHook = ''
            export NPM_CONFIG_PREFIX="''${PWD}/.npm-global"
            mkdir -p "$NPM_CONFIG_PREFIX"
            export PATH="$NPM_CONFIG_PREFIX/bin:$PATH"

            if ! command -v gemini >/dev/null 2>&1; then
              echo "Installing @google/gemini-cli globally via npm..." >&2
              npm install -g --no-progress --no-audit --no-fund @google/gemini-cli || echo "warning: failed to install gemini-cli" >&2
            fi

            if ! command -v op >/dev/null 2>&1; then
              echo "warning: 1Password CLI 'op' not found in PATH" >&2
            else
              if ! op account get --account my >/dev/null 2>&1; then
                echo "Sign in to 1Password account 'my'..." >&2
                eval "$(op signin --account my)"
              fi

              gem_key="$(
                op item get "Gemini API" \
                  --vault Private \
                  --fields label=key \
                  --format json 2>/dev/null | jq -r '.value // empty'
              )"

              if [ -n "$gem_key" ]; then
                export GEMINI_API_KEY="$gem_key"
              else
                echo "warning: GEMINI_API_KEY missing from 1Password item 'Gemini API'" >&2
              fi
            fi
          '';
        };
      in {
        default = shell;
        gemini-cli = shell;
      }
    );
  };
}
