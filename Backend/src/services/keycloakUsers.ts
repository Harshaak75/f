import axios from "axios";
import { getTenantAdminToken } from "./keycloakAdmin";

export async function createKeycloakUser(
    tenantId: string,
    data: {
        email: string;
        firstName: string;
        lastName: string;
    }
): Promise<{ id: string }> {
    const { accessToken, realm, adminBaseUrl } =
        await getTenantAdminToken(tenantId);

    const url = `${adminBaseUrl}/admin/realms/${realm}/users`;

    try {
        const res = await axios.post(
            url,
            {
                username: data.email,
                email: data.email,
                firstName: data.firstName,
                lastName: data.lastName,
                enabled: true,
                emailVerified: true,
            },
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
            }
        );

        // ✅ Keycloak returns user ID in Location header
        const location = res.headers.location;
        if (!location) {
            throw new Error("Keycloak did not return Location header");
        }

        const userId = location.split("/").pop();
        if (!userId) {
            throw new Error("Failed to extract Keycloak user ID");
        }

        return { id: userId };
    } catch (err: any) {
        console.error("Keycloak create user failed:", {
            url,
            status: err.response?.status,
            data: err.response?.data,
        });
        throw err;
    }
}

