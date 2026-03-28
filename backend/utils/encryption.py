import os
from cryptography.fernet import Fernet


def _get_fernet() -> Fernet:
    secret = os.environ.get('BRANDS_SECRET', '')
    if not secret:
        raise RuntimeError('BRANDS_SECRET env var is not set')
    return Fernet(secret.encode())


def encrypt_key(plaintext: str) -> str:
    return _get_fernet().encrypt(plaintext.encode()).decode()


def decrypt_key(token: str) -> str:
    return _get_fernet().decrypt(token.encode()).decode()
