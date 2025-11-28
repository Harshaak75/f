import axios from "axios";
import prisma from "../prisma/client";

/* =========================
   UTILITY: Extract base + realm from issuerUrl
   Example issuer: http://168.119.xx.xx:8090/realms/dotspeaks
========================= */
function extractKeycloakInfo(issuerUrl: string) {
  const parts = issuerUrl.split("/realms/");
  const baseUrl = parts[0];     // http://host:8090
  const realm = parts[1];        // dotspeaks

  return { baseUrl, realm };
}

/* =========================
✅ GET ADMIN TOKEN (from DB)
========================= */
export async function getKeycloakAdminToken(tenantId: string) {
  const tenantApi = await prisma.tenant_api_table.findFirst({
    where: { tenantId, idpType: "keycloak" },
  });

  if (!tenantApi?.idpTokenUrl || !tenantApi?.idpClientId || !tenantApi?.idpClientSecret) {
    throw new Error("Keycloak config missing for this tenant");
  }

  const params = new URLSearchParams();
  params.append("grant_type", "client_credentials");
  params.append("client_id", tenantApi.idpClientId);
  params.append("client_secret", tenantApi.idpClientSecret);

  const { data } = await axios.post(
    tenantApi.idpTokenUrl,
    params,
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );

  return { accessToken: data.access_token, tenantApi };
}

/* =========================
✅ CREATE USER + ROLE + EMAIL
========================= */
export async function createKeycloakUser({
  email,
  firstName,
  lastName,
  designation,
  tenantId
}: {
  email: string;
  firstName: string;
  lastName: string;
  designation: string;
  tenantId: string;
}) {
  const { accessToken, tenantApi } = await getKeycloakAdminToken(tenantId);

  if (!tenantApi.idpIssuerUrl) {
    throw new Error("Issuer URL missing in tenant_api_table");
  }

  const { baseUrl, realm } = extractKeycloakInfo(tenantApi.idpIssuerUrl);

  /* -------------------------
     1. CREATE USER
  --------------------------*/
  const createRes = await axios.post(
    `${baseUrl}/admin/realms/${realm}/users`,
    {
      username: email,
      email,
      firstName,
      lastName,
      enabled: true,
      emailVerified: false,
    },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  const location = createRes.headers["location"];
  const keycloakUserId = location.split("/").pop();

  if (!keycloakUserId) {
    throw new Error("Failed to receive Keycloak userId");
  }

  /* -------------------------
     2. GET / CREATE ROLE
  --------------------------*/
  const { data: roles } = await axios.get(
    `${baseUrl}/admin/realms/${realm}/roles`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  let role = roles.find((r: any) => r.name === designation);

  if (!role) {
    await axios.post(
      `${baseUrl}/admin/realms/${realm}/roles`,
      { name: designation },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const { data: newRole } = await axios.get(
      `${baseUrl}/admin/realms/${realm}/roles/${designation}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    role = newRole;
  }

  /* -------------------------
     3. ASSIGN ROLE
  --------------------------*/
  await axios.post(
    `${baseUrl}/admin/realms/${realm}/users/${keycloakUserId}/role-mappings/realm`,
    [{ id: role.id, name: role.name }],
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  /* -------------------------
     4. SEND RESET PASSWORD EMAIL
  --------------------------*/
  await axios.put(
    `${baseUrl}/admin/realms/${realm}/users/${keycloakUserId}/execute-actions-email`,
    ["UPDATE_PASSWORD"],
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  /* -------------------------
     5. SAVE IN ExternalIdentity
  --------------------------*/
  await prisma.externalIdentity.create({
    data: {
      provider: "keycloak",
      subject: keycloakUserId,
      email,
      tenantId,
    },
  });

  return {
    keycloakUserId,
    role: designation,
    realm,
  };
}
