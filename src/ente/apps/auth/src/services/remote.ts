// import log from "@/next/log";
// import { apiURL } from "@/next/origins";
import { HttpStatusCode } from "axios";
import * as libsodium from "../../../../../component/login/libsodium";
// import ComlinkCryptoWorker from "../../../../packages/shared/crypto";
import { apiURL } from "../../../../packages/next/origins";
import { ApiError, CustomError } from "../../../../packages/shared/error";
import HTTPService from "../../../../packages/shared/network/HTTPService";
import { getToken } from "../../../../packages/shared/storage/localStorage/helpers";
import { getActualKey } from "../../../../packages/shared/user";
import { codeFromURIString, type Code } from "./code";

export const getAuthCodes = async (): Promise<Code[]> => {
    const masterKey = await getActualKey();
    try {
        const authKeyData = await getAuthKey();
        // const cryptoWorker = await ComlinkCryptoWorker.getInstance();
        const authenticatorKey = await libsodium.decryptB64(
            authKeyData.encryptedKey,
            authKeyData.header,
            masterKey,
        );
        // always fetch all data from server for now
        const authEntity: AuthEntity[] = await getDiff(0);
        const authCodes = await Promise.all(
            authEntity
                .filter((f) => !f.isDeleted)
                .map(async (entity) => {
                    if (!entity.id) return undefined;
                    if (!entity.encryptedData) return undefined;
                    if (!entity.header) return undefined;
                    try {
                        const decryptedCode =
                            await libsodium.decryptMetadata(
                                entity.encryptedData,
                                entity.header,
                                authenticatorKey,
                            );
                        return codeFromURIString(entity.id, decryptedCode);
                    } catch (e) {
                        console.error(`Failed to parse codeID ${entity.id}`, e);
                        return undefined;
                    }
                }),
        );
        const filteredAuthCodes = authCodes.filter((f) => f !== undefined);
        filteredAuthCodes.sort((a, b) => {
            if (a.issuer && b.issuer) {
                return a.issuer.localeCompare(b.issuer);
            }
            if (a.issuer) {
                return -1;
            }
            if (b.issuer) {
                return 1;
            }
            return 0;
        });
        return filteredAuthCodes;
    } catch (e) {
        if (e instanceof Error && e.message != CustomError.AUTH_KEY_NOT_FOUND) {
            console.error("get authenticator entities failed", e);
        }
        throw e;
    }
};

interface AuthEntity {
    id: string;
    encryptedData: string | null;
    header: string | null;
    isDeleted: boolean;
    createdAt: number;
    updatedAt: number;
}

interface AuthKey {
    encryptedKey: string;
    header: string;
}

export const getAuthKey = async (): Promise<AuthKey> => {
    try {
        const resp = await HTTPService.get(
            await apiURL("/authenticator/key"),
            {},
            {
                "X-Auth-Token": getToken(),
            },
        );
        return resp.data;
    } catch (e) {
        if (
            e instanceof ApiError &&
            e.httpStatusCode == HttpStatusCode.NotFound
        ) {
            throw Error(CustomError.AUTH_KEY_NOT_FOUND);
        } else {
            console.error("Get key failed", e);
            throw e;
        }
    }
};

// return a promise which resolves to list of AuthEnitity
export const getDiff = async (
    sinceTime: number,
    limit = 2500,
): Promise<AuthEntity[]> => {
    try {
        const resp = await HTTPService.get(
            await apiURL("/authenticator/entity/diff"),
            {
                sinceTime,
                limit,
            },
            {
                "X-Auth-Token": getToken(),
            },
        );
        return resp.data.diff;
    } catch (e) {
        console.error("Get diff failed", e);
        throw e;
    }
};
