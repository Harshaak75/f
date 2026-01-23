import axios from "axios";
import { getTenantAdminToken } from "./keycloakAdmin";

export async function assignRealmRole(
  tenantId: string,
  keycloakUserId: string,
  roleName: "OPERATOR" | "MANAGER" | "PROJECT_MANAGER"
) {
  const { accessToken, realm, adminBaseUrl } =
    await getTenantAdminToken(tenantId);

  // 1️⃣ Fetch role representation
  const roleRes = await axios.get(
    `${adminBaseUrl}/admin/realms/${realm}/roles/${roleName}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const roleRep = roleRes.data;

  // 2️⃣ Assign role to user
  await axios.post(
    `${adminBaseUrl}/admin/realms/${realm}/users/${keycloakUserId}/role-mappings/realm`,
    [roleRep], // ⬅️ single role only
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );
}
