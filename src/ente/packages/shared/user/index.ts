import { getFromCache } from "../../../../cache";
import * as libsodium from "../../../../component/login/libsodium";
import type { B64EncryptionResult } from "../../shared/crypto/internal/libsodium";
import { CustomError } from "../../shared/error";
import { SESSION_KEYS } from "../../shared/storage/sessionStorage";

export const getActualKey = async () => {
    try {
        const encryptionKeyAttributes: B64EncryptionResult = await getFromCache( // getKey(
            SESSION_KEYS.ENCRYPTION_KEY,
        );

        const key = await libsodium.decryptB64(
            encryptionKeyAttributes.encryptedData,
            encryptionKeyAttributes.nonce,
            encryptionKeyAttributes.key,
        );
        return key;
    } catch (e) {
        throw new Error(CustomError.KEY_MISSING);
    }
};
