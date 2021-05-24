import { decrypt, encrypt } from './utils';

describe('utils', () => {
  test('encrypt returns undefined for undefined input', () => {
    const value = encrypt(undefined, 'secret');
    expect(value).toBeUndefined();
  });
  test('decrypt returns undefined for undefined input', () => {
    const value = decrypt(undefined, 'secret');
    expect(value).toBeUndefined();
  });
  test('encrypt & decrypts the string', () => {
    const masked = encrypt('Hello World!', 'secret');
    const unmasked = decrypt(masked, 'secret');
    expect(unmasked).toBe('Hello World!');
  });
  test('encrypt & decrypts the object', () => {
    const masked = encrypt({ message: 'Hello World!' }, 'secret');
    const unmasked = decrypt(masked, 'secret');
    expect(unmasked).toStrictEqual({ message: 'Hello World!' });
  });
});
