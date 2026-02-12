import axios from "axios";
import { getTenantAdminToken } from "./keycloakAdmin";

export async function createKeycloakUser(
    tenantId: string,
    data: {
        email: string;
        firstName: string;
        lastName: string;
        department?: string; // Department information
    }
): Promise<{ id: string }> {
    let { accessToken, realm, adminBaseUrl } =
        await getTenantAdminToken(tenantId);
    // only for testing

    if (adminBaseUrl == "http://keycloak:8080") {
        adminBaseUrl = "http://194.163.139.103:8090"
    }

    console.log("adminBaseUrl", adminBaseUrl);
    console.log("realm", realm);
    console.log("accessToken", accessToken);

    const url = `${adminBaseUrl}/admin/realms/${realm}/users`;
    console.log("url", url);

    try {
        // Prepare user attributes - store department if provided
        console.log("data", data);
        const attributes: Record<string, string[]> = {};
        if (data.department) {
            attributes.department = [data.department];
        }

        console.log("attributes", attributes);

        const res = await axios.post(
            url,
            {
                username: data.email,
                email: data.email,
                firstName: data.firstName,
                lastName: data.lastName,
                enabled: true,
                emailVerified: true,
                attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
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

        console.log("✅ User created with ID:", userId);

        // ✅ Update user with attributes (Keycloak sometimes doesn't accept attributes during creation)
        if (data.department) {
            try {
                console.log("🔄 Updating user with department attribute:", data.department);

                // Try updating with just the essential fields + attributes
                const updatePayload = {
                    firstName: data.firstName,
                    lastName: data.lastName,
                    email: data.email,
                    emailVerified: true,
                    enabled: true,
                    attributes: {
                        department: [data.department],
                    },
                };

                console.log("🚀 Simplified update payload:", JSON.stringify(updatePayload, null, 2));

                // Update with attributes
                const updateRes = await axios.put(
                    `${adminBaseUrl}/admin/realms/${realm}/users/${userId}`,
                    updatePayload,
                    {
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            "Content-Type": "application/json",
                        },
                    }
                );

                console.log("✅ Update response status:", updateRes.status);

                // Wait a moment for Keycloak to process
                await new Promise(resolve => setTimeout(resolve, 500));

                // Verify the update
                const verifyRes = await axios.get(
                    `${adminBaseUrl}/admin/realms/${realm}/users/${userId}`,
                    {
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                        },
                    }
                );

                console.log("📋 Verified attributes:", JSON.stringify(verifyRes.data.attributes, null, 2));

                if (verifyRes.data.attributes?.department) {
                    console.log("✅✅✅ SUCCESS! Department saved:", verifyRes.data.attributes.department);
                } else {
                    console.log("❌ FAILED: Attributes still not saved. This might be a Keycloak permission issue.");
                    console.log("💡 Check if the service account has 'manage-users' role in realm-management");
                }
            } catch (updateError: any) {
                console.error("⚠️ Failed to update department attribute:", updateError.response?.data || updateError.message);
            }
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

