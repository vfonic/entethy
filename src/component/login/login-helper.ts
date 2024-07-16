import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { encode } from "hi-base32";
import {
  addToCache,
  APPS_KEY,
  checkIfCached,
  DEVICE_ID,
  ENTE_EMAIL,
  getFromCache,
  OTP_SERVICES_KEY,
  removeFromCache,
  SECRET_SEED,
  SERVICES_KEY,
  SRP_ATTRIBUTES,
} from "../../cache";
import {
  checkRequestStatus,
  completeRegistration,
  getAuthyApps,
  getServices,
  getSRPAttributes,
} from "../../client/ente-auth-client";
import { generateTOTP } from "../../util/totp";
import { mapOtpServices } from "../../util/utils";

export interface Service {
  id: string;
  name: string;
  digits: number;
  period: number;
  seed: string | null;
  accountType?: string;
  issuer?: string;
  logo?: string;
  type: "authy" | "service";
}

const { enteEmail } = getPreferenceValues<{ enteEmail: string }>();

// SRP - Secure Remote Password
export async function getSrpData() {
  try {
    const hasSrpData = await checkIfCached(SRP_ATTRIBUTES);
    if (!hasSrpData) {
      const srpAttributes = await getSRPAttributes(enteEmail);
      await addToCache(SRP_ATTRIBUTES, JSON.stringify(srpAttributes));
    }
  } catch (error) {
    if (error instanceof Error) {
      await showToast({ style: Toast.Style.Failure, title: "Ente Auth", message: error.message });
    } else {
      throw error;
    }
  }
}

export async function login(setLogin: (step: boolean) => void) {
  const loginToast = new Toast({ title: "Ente Auth" });

  try {
    // check if login request exist
    if (!(await checkIfCached(SRP_ATTRIBUTES))) {
      loginToast.message = "Login Request not found";
      loginToast.style = Toast.Style.Failure;
      await loginToast.show();
      return;
    }

    const requestId: string = await getFromCache(SRP_ATTRIBUTES);
    const device = await checkForApproval(requestId, loginToast);

    if (device == undefined) {
      return;
    }

    await getOtpServices(device.device.id, device.device.secret_seed, loginToast);
    await addToCache(ENTE_EMAIL, enteEmail);

    await loginToast.hide();

    loginToast.style = Toast.Style.Success;
    loginToast.message = "Success Login";
    await loginToast.show();

    setLogin(true);
    await loginToast.hide();
  } catch (error) {
    if (error instanceof Error) {
      await loginToast.hide();
      loginToast.message = `Something went wrong. Try again.\n${error.message}`;
      loginToast.style = Toast.Style.Failure;
      await loginToast.show();
    } else {
      throw error;
    }
  }
}

export async function resetSrpData() {
  await removeFromCache(SRP_ATTRIBUTES);
  // await removeFromCache(DEVICE_ID);
  // await removeFromCache(SECRET_SEED);
  await getSrpData();
}

async function checkForApproval(requestId: string, toast: Toast) {
  toast.message = "Checking request status";
  toast.style = Toast.Style.Animated;
  await toast.show();

  const registrationStatus = await checkRequestStatus(enteEmail, requestId);

  if (registrationStatus.status == "rejected") {
    await toast.hide();

    toast.message = "Seems like you rejected registration request";
    toast.style = Toast.Style.Failure;
    await toast.show();

    await removeFromCache(SRP_ATTRIBUTES);
    return;
  }

  if (registrationStatus.status == "pending") {
    await toast.hide();

    toast.message = "Seems like you didn't approve registration request";
    toast.style = Toast.Style.Failure;
    await toast.show();

    return;
  }

  const device = await completeRegistration(enteEmail, registrationStatus.pin);
  await addToCache(DEVICE_ID, device.device.id);
  await addToCache(SECRET_SEED, device.device.secret_seed);
  await toast.hide();
  return device;
}

export async function getOtpServices(deviceId: number, secretSeed: string, toast: Toast) {
  toast.message = "Getting Services";
  toast.style = Toast.Style.Animated;
  await toast.show();

  const seed = encode(Buffer.from(secretSeed, "hex"));
  const timestamp = new Date();
  const otps = [
    generateTOTP(seed, { digits: 7, period: 10, timestamp: timestamp.getTime() }),
    generateTOTP(seed, { digits: 7, period: 10, timestamp: timestamp.getTime() + 10 * 1000 }),
    generateTOTP(seed, { digits: 7, period: 10, timestamp: timestamp.getTime() + 10 * 2 * 1000 }),
  ];

  // get authy apps
  const authyAppResponse = await getAuthyApps(enteEmail, deviceId, otps);
  // get 3rd party services
  const authyServicesResponse = await getServices(enteEmail, deviceId, otps);
  // map opt Services to common format
  const optServices = mapOtpServices(authyServicesResponse.authenticator_tokens, authyAppResponse.apps);

  await addToCache(SERVICES_KEY, authyServicesResponse);
  await addToCache(APPS_KEY, authyAppResponse);
  await addToCache(OTP_SERVICES_KEY, optServices);

  return optServices;
}

export async function logout() {
  await removeFromCache(SECRET_SEED);
  await removeFromCache(DEVICE_ID);
  await removeFromCache(SERVICES_KEY);
  await removeFromCache(APPS_KEY);
  await removeFromCache(SRP_ATTRIBUTES);
  await removeFromCache(OTP_SERVICES_KEY);
}
