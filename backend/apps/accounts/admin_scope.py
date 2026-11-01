"""Registry kapabilitas admin. Dikunci oleh apps/accounts/tests/test_admin_scope.py.

Hanya entri fase yang sedang dikerjakan yang boleh ditambahkan. Endpoint admin
baru tanpa entri di sini akan membuat tes pengunci gagal.
"""

ADMIN_CAPABILITIES = [
    {
        "id": "ADM-01",
        "rujukan": "PRD F-ADM-01; matriks Kelola akun & role",
        "fase": 0,
        "method": "GET",
        "path": "/api/v1/auth/akun/",
        "roles": ("admin",),
        "requires_2fa": True,
    },
    {
        "id": "ADM-01",
        "rujukan": "PRD F-ADM-01; matriks Kelola akun & role",
        "fase": 0,
        "method": "POST",
        "path": "/api/v1/auth/akun/",
        "roles": ("admin",),
        "requires_2fa": True,
    },
    {
        "id": "ADM-01",
        "rujukan": "PRD F-ADM-01; matriks Kelola akun & role",
        "fase": 0,
        "method": "GET",
        "path": "/api/v1/auth/akun/<int:pk>/",
        "roles": ("admin",),
        "requires_2fa": True,
    },
    {
        "id": "ADM-01",
        "rujukan": "PRD F-ADM-01; matriks Kelola akun & role",
        "fase": 0,
        "method": "PATCH",
        "path": "/api/v1/auth/akun/<int:pk>/",
        "roles": ("admin",),
        "requires_2fa": True,
    },
    {
        "id": "ADM-01",
        "rujukan": "PRD F-ADM-01; matriks Kelola akun & role",
        "fase": 0,
        "method": "POST",
        "path": "/api/v1/auth/akun/<int:pk>/reset-password/",
        "roles": ("admin",),
        "requires_2fa": True,
    },
    {
        "id": "SEC-02",
        "rujukan": "ARSITEKTUR 9; pemulihan perangkat TOTP hilang",
        "fase": 0,
        "method": "POST",
        "path": "/api/v1/auth/akun/<int:pk>/reset-2fa/",
        "roles": ("admin",),
        "requires_2fa": True,
    },
    {
        "id": "SEC-01",
        "rujukan": "CLAUDE.md Role; ARSITEKTUR 8.1 butir 6",
        "fase": 0,
        "method": "POST",
        "path": "/api/v1/auth/2fa/setup/",
        "roles": ("admin",),
        "requires_2fa": False,
    },
    {
        "id": "SEC-01",
        "rujukan": "CLAUDE.md Role; ARSITEKTUR 8.1 butir 6",
        "fase": 0,
        "method": "POST",
        "path": "/api/v1/auth/2fa/verify/",
        "roles": ("admin",),
        "requires_2fa": False,
    },
    {
        "id": "ADM-03",
        "rujukan": "PRD F-ADM-03; ARSITEKTUR 9",
        "fase": 0,
        "method": "GET",
        "path": "/api/v1/audit/",
        "roles": ("admin",),
        "requires_2fa": True,
    },
]


def _katalog(path, methods):
    # ADM-10 = kelola katalog (PRD F-INV-01). Nomor 31 dipakai rencana pengaturan toko.
    return [
        {
            "id": "ADM-10",
            "rujukan": "PRD F-INV-01; ARSITEKTUR 7 (Katalog kelola)",
            "fase": 1,
            "method": method,
            "path": f"/api/v1/katalog/kelola/{path}",
            "roles": ("admin",),
            "requires_2fa": True,
        }
        for method in methods
    ]


ADMIN_CAPABILITIES += [
    *_katalog("kategori/", ("GET", "POST")),
    *_katalog("kategori/<int:pk>/", ("GET", "PUT", "PATCH", "DELETE")),
    *_katalog("motif/", ("GET", "POST")),
    *_katalog("motif/<int:pk>/", ("GET", "PUT", "PATCH", "DELETE")),
    *_katalog("produk/", ("GET", "POST")),
    *_katalog("produk/<int:pk>/", ("GET", "PUT", "PATCH", "DELETE")),
    *_katalog("produk/<int:pk>/varian/", ("GET", "POST")),
    *_katalog("produk/<int:pk>/foto/", ("POST",)),
    *_katalog("varian/<int:pk>/", ("GET", "PUT", "PATCH", "DELETE")),
    *_katalog("foto/<int:pk>/", ("DELETE",)),
]
