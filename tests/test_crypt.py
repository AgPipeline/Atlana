"""Tests Cryptography implementation"""

import random
import string
from crypt import Crypt
from Crypto.Cipher import AES
import pytest

# List of different clear text lengths to test out
CLEAR_TEXT_TEST_LENGTHS = [1, 100, 5000]

# The default text length to test
DEFAULT_CLEAR_TEXT_LENGTH = 100

# Default password length to generate
DEFAULT_PASSWORD_LENGTH = AES.key_size[0]


def _generate_random_string(str_len: int=500, chars: str=string.ascii_uppercase + string.ascii_lowercase + string.digits) -> str:
    """Used to generate a random string using letters and digits
    Arguments:
        str_len - the length of the string to generate
    Return:
        Returns a random string of the specified length
    """
    return ''.join(random.choice(chars) for _ in range(str_len))


def test_salt_length():
    """Tests the salt length returned by  the Crypt class"""
    assert Crypt.get_salt_length() == AES.block_size


def test_adjust_salt():
    """Tests the adjustment of salt values to match the block size"""
    assert len(Crypt.adjust_crypto_salt('a')) == Crypt.get_salt_length()
    assert len(Crypt.adjust_crypto_salt(_generate_random_string(Crypt.get_salt_length() * 2))) ==  Crypt.get_salt_length()

    # Exception handling
    with pytest.raises(RuntimeError) as except_info:
        Crypt.adjust_crypto_salt(None)
        assert except_info.message.startswith('Salt value of None')
    with pytest.raises(RuntimeError) as except_info:
        Crypt.adjust_crypto_salt(b'binary string')
        assert except_info.message.startswith('Salt type is binary')
    with pytest.raises(RuntimeError) as except_info:
        Crypt.adjust_crypto_salt({'invalid': 'type'})
        assert except_info.message.startswith('Salt is not a string')


def test_adjust_passcode():
    """Tests the adjustment of passcodes"""
    for cur_len in AES.key_size:
        assert len(Crypt.adjust_crypto_passcode(_generate_random_string(cur_len - 1))) == cur_len

    max_len = max(AES.key_size)
    assert len(Crypt.adjust_crypto_passcode(_generate_random_string(max_len * 2))) == max_len

    # Exception handling
    with pytest.raises(RuntimeError) as except_info:
        Crypt.adjust_crypto_passcode(None)
        assert except_info.message.startswith('Passcode value of None')
    with pytest.raises(RuntimeError) as except_info:
        Crypt.adjust_crypto_passcode(b'binary string')
        assert except_info.message.startswith('Passcode type is binary')
    with pytest.raises(RuntimeError) as except_info:
        Crypt.adjust_crypto_passcode({'invalid': 'type'})
        assert except_info.message.startswith('Passcode is not a string')


def test_encrypt_decrypt_valid():
    """Tests encrypting and decrypting strings appropriately"""
    salt = _generate_random_string(Crypt.get_salt_length())
    crypt = Crypt(salt)

    password = _generate_random_string(DEFAULT_PASSWORD_LENGTH)

    # Try strings of differing length
    for clear_len in CLEAR_TEXT_TEST_LENGTHS:
        original_text =_generate_random_string(clear_len)
        cipher_text = crypt.encrypt(original_text, password)
        clear_text = crypt.decrypt(cipher_text, password)
        assert len(clear_text) == len(original_text)
        assert clear_text == original_text


def test_encrypt_decrypt_password():
    """Tests incorrect password sizes (should be handled automatically)"""
    salt = _generate_random_string(Crypt.get_salt_length())
    crypt = Crypt(salt)

    password = _generate_random_string(AES.key_size[0] - 1)
    original_text =_generate_random_string(DEFAULT_CLEAR_TEXT_LENGTH)

    cipher_text = crypt.encrypt(original_text, password)
    clear_text = crypt.decrypt(cipher_text, password)
    assert len(clear_text) == len(original_text)
    assert clear_text == original_text


def test_encrypt_decrypt_except():
    """Tests encrypting and decrypting strings using bad values"""
    good_salt = _generate_random_string(Crypt.get_salt_length())
    good_crypt = Crypt(good_salt)

    password = _generate_random_string(DEFAULT_PASSWORD_LENGTH)
    original_text = _generate_random_string(DEFAULT_CLEAR_TEXT_LENGTH)
    cipher_text = good_crypt.encrypt(original_text, password)

    bad_salt =_generate_random_string(Crypt.get_salt_length() - 1)
    bad_crypt = Crypt(bad_salt)

    with pytest.raises(ValueError):
        # Do encryption
        bad_crypt.encrypt(original_text, password)

    with pytest.raises(ValueError):
        # Do decryption
        bad_crypt.decrypt(cipher_text, password)

    with pytest.raises(ValueError):
        # Bad cipher string
        bad_crypt.decrypt(original_text, password)

    with pytest.raises(AttributeError):
        # Bad plain text parameter
        good_crypt.encrypt(None, password)

    with pytest.raises(AttributeError):
        # Bad plain text parameter
        good_crypt.encrypt(b'foo', password)

    with pytest.raises(AttributeError):
        # Bad plain text parameter
        good_crypt.encrypt({'bad':'value'}, password)
