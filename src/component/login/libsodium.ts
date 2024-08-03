import sodium from "libsodium-wrappers-sumo"

/**
 * Convert a {@link Uint8Array} to a Base64 encoded string.
 *
 * See also {@link toB64URLSafe} and {@link toB64URLSafeNoPadding}.
 */
export const toB64 = async (input: Uint8Array) => {
  await sodium.ready
  return sodium.to_base64(input, sodium.base64_variants.ORIGINAL)
}

/**
 * Convert a Base64 encoded string to a {@link Uint8Array}.
 *
 * This is the converse of {@link toBase64}.
 */
export const fromB64 = async (input: string) => {
  await sodium.ready
  return sodium.from_base64(input, sodium.base64_variants.ORIGINAL)
}

/**
 * Convert a {@link Uint8Array} to a URL-safe Base64 encoded string.
 *
 * See also {@link toB64URLSafe} and {@link toB64URLSafeNoPadding}.
 */
export const toB64URLSafe = async (input: Uint8Array) => {
  await sodium.ready
  return sodium.to_base64(input, sodium.base64_variants.URLSAFE)
}

export async function fromUTF8(input: string) {
  await sodium.ready
  return sodium.from_string(input)
}

export async function decryptB64(data: string, nonce: string, key: string) {
  await sodium.ready
  const decrypted = await decrypt(await fromB64(data), await fromB64(nonce), await fromB64(key))

  return await toB64(decrypted)
}

const textDecoder = new TextDecoder()
export async function decryptMetadata(encryptedMetadata: string, header: string, key: string) {
  const encodedMetadata = await decryptChaChaOneShot(await fromB64(encryptedMetadata), await fromB64(header), key)
  return JSON.parse(textDecoder.decode(encodedMetadata))
}

export async function decryptChaChaOneShot(data: Uint8Array, header: Uint8Array, key: string) {
  await sodium.ready
  const pullState = sodium.crypto_secretstream_xchacha20poly1305_init_pull(header, await fromB64(key))
  const pullResult = sodium.crypto_secretstream_xchacha20poly1305_pull(pullState, data, null)
  return pullResult.message
}

async function encrypt(data: Uint8Array, key: Uint8Array) {
  await sodium.ready
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES)
  const encryptedData = sodium.crypto_secretbox_easy(data, nonce, key)
  return {
    encryptedData,
    key,
    nonce,
  }
}

async function decrypt(data: Uint8Array, nonce: Uint8Array, key: Uint8Array) {
  await sodium.ready
  return sodium.crypto_secretbox_open_easy(data, nonce, key)
}

export async function deriveKey(passphrase: string, salt: string, opsLimit: number, memLimit: number) {
  await sodium.ready
  return await toB64(
    sodium.crypto_pwhash(
      sodium.crypto_secretbox_KEYBYTES,
      await fromUTF8(passphrase),
      await fromB64(salt),
      opsLimit,
      memLimit,
      sodium.crypto_pwhash_ALG_ARGON2ID13,
    ),
  )
}

export async function deriveSensitiveKey(passphrase: string, salt: string) {
  await sodium.ready
  const minMemLimit = sodium.crypto_pwhash_MEMLIMIT_MIN
  let opsLimit = sodium.crypto_pwhash_OPSLIMIT_SENSITIVE
  let memLimit = sodium.crypto_pwhash_MEMLIMIT_SENSITIVE
  while (memLimit > minMemLimit) {
    try {
      const key = await deriveKey(passphrase, salt, opsLimit, memLimit)
      return {
        key,
        opsLimit,
        memLimit,
      }
    } catch (e) {
      opsLimit *= 2
      memLimit /= 2
    }
  }
  throw new Error("Failed to derive key: Memory limit exceeded")
}

export async function deriveInteractiveKey(passphrase: string, salt: string) {
  await sodium.ready
  const key = await toB64(
    sodium.crypto_pwhash(
      sodium.crypto_secretbox_KEYBYTES,
      await fromUTF8(passphrase),
      await fromB64(salt),
      sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
      sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
      sodium.crypto_pwhash_ALG_ARGON2ID13,
    ),
  )
  return {
    key,
    opsLimit: sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
    memLimit: sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
  }
}

export async function generateEncryptionKey() {
  await sodium.ready
  return await toB64(sodium.crypto_kdf_keygen())
}

export async function generateSaltToDeriveKey() {
  await sodium.ready
  return await toB64(sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES))
}

/**
 * Generate a new public/private keypair, and return their Base64
 * representations.
 */
export const generateKeyPair = async () => {
  await sodium.ready
  const keyPair = sodium.crypto_box_keypair()
  return {
    publicKey: await toB64(keyPair.publicKey),
    privateKey: await toB64(keyPair.privateKey),
  }
}

export async function boxSealOpen(input: string, publicKey: string, secretKey: string) {
  await sodium.ready
  return await toB64(sodium.crypto_box_seal_open(await fromB64(input), await fromB64(publicKey), await fromB64(secretKey)))
}

export async function toHex(input: string) {
  await sodium.ready
  return sodium.to_hex(await fromB64(input))
}

export async function fromHex(input: string) {
  await sodium.ready
  return await toB64(sodium.from_hex(input))
}

export interface B64EncryptionResult {
  encryptedData: string
  key: string
  nonce: string
}

export async function encryptToB64(data: string, key: string) {
  await sodium.ready
  const encrypted = await encrypt(await fromB64(data), await fromB64(key))

  return {
    encryptedData: await toB64(encrypted.encryptedData),
    key: await toB64(encrypted.key),
    nonce: await toB64(encrypted.nonce),
  } as B64EncryptionResult
}

export async function generateKeyAndEncryptToB64(data: string) {
  await sodium.ready
  const key = sodium.crypto_secretbox_keygen()
  return await encryptToB64(data, await toB64(key))
}

export async function generateSubKey(key: string, subKeyLength: number, subKeyID: number, context: string) {
  await sodium.ready
  return await toB64(sodium.crypto_kdf_derive_from_key(subKeyLength, subKeyID, context, await fromB64(key)))
}
