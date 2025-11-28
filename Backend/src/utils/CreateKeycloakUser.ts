import axios from "axios";
import env from "dotenv";
env.config();

const KEYCLOAK_BASE_URL = process.env.KEYCLOAK_BASE_URL!;
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM!;
const KEYCLOAK_CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID!;
const KEYCLOAK_CLIENT_SECRET = process.env.KEYCLOAK_CLIENT_SECRET!;

/* =========================
✅ GET ADMIN TOKEN
========================= */
export async function getKeycloakAdminToken(): Promise<string> {
  const params = new URLSearchParams();

  params.append("grant_type", "client_credentials");
  params.append("client_id", KEYCLOAK_CLIENT_ID);
  params.append("client_secret", KEYCLOAK_CLIENT_SECRET);

  const { data } = await axios.post(
    `${KEYCLOAK_BASE_URL}/realms/master/protocol/openid-connect/token`,
    params,
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );

  return data.access_token;
}

/* =========================
✅ CREATE USER + SET ROLE
========================= */
export async function createKeycloakUser({
  email,
  firstName,
  lastName,
  designation,
}: {
  email: string;
  firstName: string;
  lastName: string;
  designation: string;
}) {
  const token = await getKeycloakAdminToken();

  /* --- 1. Create User --- */
  const createRes = await axios.post(
    `${KEYCLOAK_BASE_URL}/admin/realms/${KEYCLOAK_REALM}/users`,
    {
      username: email,
      email,
      firstName,
      lastName,
      enabled: true,
      emailVerified: false,
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const location = createRes.headers["location"];
  const userId = location.split("/").pop();

  /* --- 2. Get or Create Role (designation) --- */
  const { data: roles } = await axios.get(
    `${KEYCLOAK_BASE_URL}/admin/realms/${KEYCLOAK_REALM}/roles`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  let role = roles.find((r: any) => r.name === designation);

  if (!role) {
    await axios.post(
      `${KEYCLOAK_BASE_URL}/admin/realms/${KEYCLOAK_REALM}/roles`,
      { name: designation },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const { data: newRole } = await axios.get(
      `${KEYCLOAK_BASE_URL}/admin/realms/${KEYCLOAK_REALM}/roles/${designation}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    role = newRole;
  }

  /* --- 3. Assign Role to User --- */
  await axios.post(
    `${KEYCLOAK_BASE_URL}/admin/realms/${KEYCLOAK_REALM}/users/${userId}/role-mappings/realm`,
    [{ id: role.id, name: role.name }],
    { headers: { Authorization: `Bearer ${token}` } }
  );

  /* --- 4. Send Update-Password Email --- */
  await axios.put(
    `${KEYCLOAK_BASE_URL}/admin/realms/${KEYCLOAK_REALM}/users/${userId}/execute-actions-email`,
    ["UPDATE_PASSWORD"],
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return { userId, role: designation };
}
