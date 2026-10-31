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
