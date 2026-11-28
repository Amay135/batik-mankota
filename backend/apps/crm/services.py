import re

from .models import Pelanggan

NOMOR_VALID = re.compile(r"^0\d{7,14}$")


def normalisasi_telepon(telepon: str) -> str:
    """Simpan nomor Indonesia dalam bentuk 08xx (tanpa spasi, tanda hubung, atau +62)."""
    # shortcut: hanya format Indonesia (+62); tambah bila toko melayani nomor luar negeri.
    digit = re.sub(r"\D", "", telepon or "")
    if digit.startswith("62"):
        digit = "0" + digit[2:]
    return digit


def validasi_telepon(telepon: str) -> str:
    """Nomor ternormalisasi; ValueError bila bukan nomor yang wajar. Kosong diperbolehkan."""
    nomor = normalisasi_telepon(telepon)
    if nomor and not NOMOR_VALID.fullmatch(nomor):
        raise ValueError("Nomor telepon tidak valid.")
    return nomor


def pelanggan_dari_kontak(nama: str, telepon: str, email: str) -> Pelanggan:
    """Cari/buat pelanggan dari data checkout. Telepon adalah kunci utama."""
    nomor = normalisasi_telepon(telepon)
    email = (email or "").strip().lower()
    if nomor:
        pelanggan, _ = Pelanggan.objects.get_or_create(
            telepon=nomor, defaults={"nama": nama, "email": email}
        )
        return pelanggan
    # Tanpa telepon: cocokkan email, selain itu pelanggan baru (boleh tanpa identitas unik).
    if email:
        ada = Pelanggan.objects.filter(email__iexact=email).order_by("id").first()
        if ada:
            return ada
    return Pelanggan.objects.create(nama=nama, email=email)
