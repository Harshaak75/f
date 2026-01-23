import axios from "axios";
import { getTenantKeycloakConfig } from "./tenantKeycloakConfig";

export async function getTenantAdminToken(tenantId: string): Promise<{
  accessToken: string;
  realm: string;
  adminBaseUrl: string;
}> {
  const kc = await getTenantKeycloakConfig(tenantId);

  const res = await axios.post(
    kc.tokenUrl,
    new URLSearchParams({
      grant_type: "client_credentials",
      client_id: kc.clientId,
      client_secret: kc.clientSecret,
    }),
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }
  );

  return {
    accessToken: res.data.access_token,
    realm: kc.realm,
    adminBaseUrl: kc.adminBaseUrl,
  };
}
