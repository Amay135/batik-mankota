#!/usr/bin/env bash
# Aktifkan hook commit bersama. Jalankan sekali setelah clone.
set -eu

cd "$(git rev-parse --show-toplevel)"
git config core.hooksPath .githooks
chmod +x .githooks/* scripts/*.sh

echo "Hook commit aktif. Baris atribusi alat AI akan dihapus otomatis dari pesan commit."
