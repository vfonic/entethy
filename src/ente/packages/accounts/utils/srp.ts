import * as libsodium from "../../../../component/login/libsodium";
import { generateLoginSubKey } from "../../shared/crypto/helpers";
import type { KeyAttributes } from "../../shared/user/types";
import { generateSRPSetupAttributes } from "../services/srp";
import type { SRPSetupAttributes } from "../types/srp";

export async function generateKeyAndSRPAttributes(passphrase: string): Promise<{
    keyAttributes: KeyAttributes;
    masterKey: string;
    srpSetupAttributes: SRPSetupAttributes;
}> {
    const masterKey = await libsodium.generateEncryptionKey();
    const recoveryKey = await libsodium.generateEncryptionKey();
    const kekSalt = await libsodium.generateSaltToDeriveKey();
    const kek = await libsodium.deriveSensitiveKey(passphrase, kekSalt);

    const masterKeyEncryptedWithKek = await libsodium.encryptToB64(
        masterKey,
        kek.key,
    );
    const masterKeyEncryptedWithRecoveryKey = await libsodium.encryptToB64(
        masterKey,
        recoveryKey,
    );
    const recoveryKeyEncryptedWithMasterKey = await libsodium.encryptToB64(
        recoveryKey,
        masterKey,
    );

    const keyPair = await libsodium.generateKeyPair();
    const encryptedKeyPairAttributes = await libsodium.encryptToB64(
        keyPair.privateKey,
        masterKey,
    );

    const loginSubKey = await generateLoginSubKey(kek.key);

    const srpSetupAttributes = await generateSRPSetupAttributes(loginSubKey);

    const keyAttributes: KeyAttributes = {
        kekSalt,
        encryptedKey: masterKeyEncryptedWithKek.encryptedData,
        keyDecryptionNonce: masterKeyEncryptedWithKek.nonce,
        publicKey: keyPair.publicKey,
        encryptedSecretKey: encryptedKeyPairAttributes.encryptedData,
        secretKeyDecryptionNonce: encryptedKeyPairAttributes.nonce,
        opsLimit: kek.opsLimit,
        memLimit: kek.memLimit,
        masterKeyEncryptedWithRecoveryKey:
            masterKeyEncryptedWithRecoveryKey.encryptedData,
        masterKeyDecryptionNonce: masterKeyEncryptedWithRecoveryKey.nonce,
        recoveryKeyEncryptedWithMasterKey:
            recoveryKeyEncryptedWithMasterKey.encryptedData,
        recoveryKeyDecryptionNonce: recoveryKeyEncryptedWithMasterKey.nonce,
    };

    return {
        keyAttributes,
        masterKey,
        srpSetupAttributes,
    };
}
