import axios from "axios";
import { getTenantAdminToken } from "./keycloakAdmin";

export async function addTenantAttributeToAllUsers(
  tenantId: string,
  tenantCode: string
) {
  const { accessToken, realm, adminBaseUrl } =
    await getTenantAdminToken(tenantId);

  let first = 0;
  const max = 100;

  while (true) {
    const listRes = await axios.get(
      `${adminBaseUrl}/admin/realms/${realm}/users`,
      {
        params: { first, max },
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const users = listRes.data;
    if (!users.length) break;

    for (const u of users) {
      // 🔥 Fetch FULL user (very important)
      const userRes = await axios.get(
        `${adminBaseUrl}/admin/realms/${realm}/users/${u.id}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      const user = userRes.data;
      const attributes = user.attributes || {};

      // ⛔ Skip if tenant already exists
      if (attributes.tenant?.length) {
        console.log(`⏭️ Tenant already exists for: ${user.username}`);
        continue;
      }

      // ✅ Preserve everything, only add attribute
      await axios.put(
        `${adminBaseUrl}/admin/realms/${realm}/users/${user.id}`,
        {
          ...user,
          attributes: {
            ...attributes,
            tenant: [tenantCode],
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log(`✅ Tenant added to user: ${user.username}`);
    }

    first += max;
  }

  console.log("🎉 Tenant attribute migration completed safely");
}

