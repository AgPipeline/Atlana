"""Implements a cryptography class for symmetrical encryption"""

# Work around a false unused-import pylint warning
# pylint: disable=unused-import
from base64 import b64encode, b64decode
from Crypto.Cipher import AES
# pylint: enable=unused-import


class Crypt:
    """Implements AES symmtetrical encryption"""

    def __init__(self, salt: str):
        """Initializes class instance
        Arguments:
            salt - the salt (IV) to use for symmetrical encryption (assumed to match expected length)
        Notes:
            The secure text is encoded as utf-8 (returned and expected secure text)
        See also:
            Crypt.get_salt_length() and Crypt.adjust_crypto_salt()
        """
        self.salt = salt.encode('utf8')
        self.encode_decode_method = 'utf-8'


    @staticmethod
    def get_salt_length() -> int:
        """Returns the expected salt length
        See also: adjust_crypto_salt()
        """
        return AES.block_size


    @staticmethod
    def adjust_crypto_salt(salt: str, silent: bool = False) -> str:
        """Adjusts the salt to match the algorithm expected value
        Arguments:
            salt - the salt value to chek
            silent - suppress messages when True
        Returns:
            The adjusted salt value
        """
        if salt is None:
            raise RuntimeError('Salt value of None passed into adjust_crypto_salt')

        if isinstance(salt, bytes):
            raise RuntimeError('Salt type is binary - please convert to a string before calling adjust_crypto_salt')
        if not isinstance(salt, str):
            raise RuntimeError('Salt is not a string - only string salt values are accepted for adjust_crypto_salt:', type(salt))

        cur_salt = salt

        if len(cur_salt) != AES.block_size:
            if not silent:
                print('Encryption salt length(', len(salt), ') is not', AES.block_size, 'bytes long. Adjusting Salt')
            if len(cur_salt) > AES.block_size:
                cur_salt = cur_salt[0:AES.block_size]
            else:
                while len(cur_salt) < AES.block_size:
                    cur_salt += '-'

        return cur_salt

    @staticmethod
    def adjust_crypto_passcode(passcode: str) -> str:
        """Adjusts (if needed) the passcode to be a valid length for the algorithm
        Arguments:
            passcode - the passcode to check and adjust
        Returns:
            Returns the adjusted passcode
        Notes:
            If the passcode isn't an acceptable length, it's adjusted to the next longest acceptable length. If the
            passcode is longer than the maximum length, it's shorted to the maximum acceptable length
        """
        if passcode is None:
            raise RuntimeError('Passcode value of None passed into adjust_crypto_passcode')

        if isinstance(passcode, bytes):
            raise RuntimeError('Passcode type is binary - please convert to a string before calling adjust_crypto_passcode')
        if not isinstance(passcode, str):
            raise RuntimeError('Passcode is not a string - only string passcode values are accepted for adjust_crypto_passcode: ',
                                type(passcode))

        max_length = max(AES.key_size)
        if len(passcode) > max_length:
            return passcode[0:max_length]

        while len(passcode) not in AES.key_size:
            passcode += '.'

        return passcode



    def encrypt(self, plain_text: str, passcode: str) -> str:
        """Encrypts a plain text string
        Arguments:
            plain_text: the text to encrypt
            passcode: the passcode to use for encryption
        Returns:
            The encrypted string
        Exceptions:
            Raises ValueError when a problem is found
        Notes:
            If the passcode is not an accepted length, it is adjusted (extended or truncated)
        """
        try:
            if len(passcode) not in AES.key_size:
                passcode = Crypt.adjust_crypto_passcode(passcode)
            aes_obj = AES.new(passcode, AES.MODE_CFB, self.salt)
            hex_encode = aes_obj.encrypt(plain_text.encode('utf8'))
            return b64encode(hex_encode).decode(self.encode_decode_method)
        except ValueError as value_error:
            raise ValueError('Encryption error') from value_error


    def decrypt(self, secure_text: str, passcode: str) -> str:
        """Decrypts an encrypted string
        Arguments:
            secure_text - the text to decrypt
            passcode - the passcode used to decrypt the text, needs to match the encryption passcode
        Returns:
            The decrypted string
        Exceptions:
            Raises ValueError when a problem is found
        Notes:
            If the passcode is not an accepted length, it is adjusted (extended or truncated)
        """
        try:
            if len(passcode) not in AES.key_size:
                passcode = Crypt.adjust_crypto_passcode(passcode)
            aes_obj = AES.new(passcode.encode('utf8'), AES.MODE_CFB, self.salt)
            str_temp = b64decode(secure_text.encode(self.encode_decode_method))
            str_decode = aes_obj.decrypt(str_temp)
            plain_text = str_decode.decode(self.encode_decode_method)
            return plain_text
        except ValueError as value_error:
            raise ValueError('Decryption error') from value_error
