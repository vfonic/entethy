import * as libsodium from "../../../../component/login/libsodium";
import { setRecoveryKey } from "../../accounts/api/user";
import log from "../../next/log";
import {
    LS_KEYS,
    getData,
    setData
} from "../../shared/storage/localStorage";
import { getToken } from "../../shared/storage/localStorage/helpers";
import { getActualKey } from "../../shared/user";
import type { KeyAttributes } from "../../shared/user/types";

const LOGIN_SUB_KEY_LENGTH = 32;
const LOGIN_SUB_KEY_ID = 1;
const LOGIN_SUB_KEY_CONTEXT = "loginctx";
const LOGIN_SUB_KEY_BYTE_LENGTH = 16;

export async function decryptAndStoreToken(
    keyAttributes: KeyAttributes,
    masterKey: string,
    user: any,
) {
    let decryptedToken = null;
    const { encryptedToken } = user;
    if (encryptedToken && encryptedToken.length > 0) {
        const secretKey = await libsodium.decryptB64(
            keyAttributes.encryptedSecretKey,
            keyAttributes.secretKeyDecryptionNonce,
            masterKey,
        );
        const urlUnsafeB64DecryptedToken = await libsodium.boxSealOpen(
            encryptedToken,
            keyAttributes.publicKey,
            secretKey,
        );
        const decryptedTokenBytes = await libsodium.fromB64(
            urlUnsafeB64DecryptedToken,
        );
        decryptedToken = await libsodium.toB64URLSafe(decryptedTokenBytes);
        return {
            ...user,
            token: decryptedToken,
            encryptedToken: null,
        };
    }
}


// We encrypt the masterKey, with an intermediate key derived from the
// passphrase (with Interactive mem and ops limits) to avoid saving it to local
// storage in plain text. This means that on the web user will always have to
// enter their passphrase to access their masterKey.
export async function generateIntermediateKeyAttributes(
    passphrase: string,
    existingKeyAttributes: KeyAttributes,
    key: string,
): Promise<KeyAttributes> {
    const intermediateKekSalt = await libsodium.generateSaltToDeriveKey();
    const intermediateKek = await libsodium.deriveInteractiveKey(
        passphrase,
        intermediateKekSalt,
    );
    const encryptedKeyAttributes = await libsodium.encryptToB64(key, intermediateKek.key);

    const intermediateKeyAttributes = Object.assign(existingKeyAttributes, {
        kekSalt: intermediateKekSalt,
        encryptedKey: encryptedKeyAttributes.encryptedData,
        keyDecryptionNonce: encryptedKeyAttributes.nonce,
        opsLimit: intermediateKek.opsLimit,
        memLimit: intermediateKek.memLimit,
    });
    return intermediateKeyAttributes;
}

export const generateLoginSubKey = async (kek: string) => {
    const kekSubKeyString = await libsodium.generateSubKey(
        kek,
        LOGIN_SUB_KEY_LENGTH,
        LOGIN_SUB_KEY_ID,
        LOGIN_SUB_KEY_CONTEXT,
    );
    const kekSubKey = await libsodium.fromB64(kekSubKeyString);

    // use first 16 bytes of generated kekSubKey as loginSubKey
    const loginSubKey = await libsodium.toB64(
        kekSubKey.slice(0, LOGIN_SUB_KEY_BYTE_LENGTH),
    );

    return loginSubKey;
};

export const generateSessionKey = async (key: string) => {
    return await libsodium.generateKeyAndEncryptToB64(key);
};

export async function encryptWithRecoveryKey(key: string) {
    const hexRecoveryKey = await getRecoveryKey();
    const recoveryKey = await libsodium.fromHex(hexRecoveryKey);
    const encryptedKey = await libsodium.encryptToB64(key, recoveryKey);
    return encryptedKey;
}

export const getRecoveryKey = async () => {
    try {
        const keyAttributes: KeyAttributes = getData(LS_KEYS.KEY_ATTRIBUTES);
        const {
            recoveryKeyEncryptedWithMasterKey,
            recoveryKeyDecryptionNonce,
        } = keyAttributes;
        const masterKey = await getActualKey();
        let recoveryKey: string;
        if (recoveryKeyEncryptedWithMasterKey) {
            recoveryKey = await libsodium.decryptB64(
                recoveryKeyEncryptedWithMasterKey,
                recoveryKeyDecryptionNonce,
                masterKey,
            );
        } else {
            recoveryKey = await createNewRecoveryKey();
        }
        recoveryKey = await libsodium.toHex(recoveryKey);
        return recoveryKey;
    } catch (e) {
        console.log(e);
        log.error("getRecoveryKey failed", e);
        throw e;
    }
};

// Used only for legacy users for whom we did not generate recovery keys during
// sign up
async function createNewRecoveryKey() {
    const masterKey = await getActualKey();
    const existingAttributes = getData(LS_KEYS.KEY_ATTRIBUTES);

    const recoveryKey = await libsodium.generateEncryptionKey();
    const encryptedMasterKey = await libsodium.encryptToB64(
        masterKey,
        recoveryKey,
    );
    const encryptedRecoveryKey = await libsodium.encryptToB64(
        recoveryKey,
        masterKey,
    );
    const recoveryKeyAttributes = {
        masterKeyEncryptedWithRecoveryKey: encryptedMasterKey.encryptedData,
        masterKeyDecryptionNonce: encryptedMasterKey.nonce,
        recoveryKeyEncryptedWithMasterKey: encryptedRecoveryKey.encryptedData,
        recoveryKeyDecryptionNonce: encryptedRecoveryKey.nonce,
    };
    await setRecoveryKey(getToken(), recoveryKeyAttributes);

    const updatedKeyAttributes = Object.assign(
        existingAttributes,
        recoveryKeyAttributes,
    );
    setData(LS_KEYS.KEY_ATTRIBUTES, updatedKeyAttributes);

    return recoveryKey;
}
