// routes/internalTenant.ts
import { Router } from "express";
import { internalAuth } from "../middleware/internalAuth";
import prisma from "../prisma/client";

const router = Router();

/**
 * POST /internal/tenant/idp-config
 */
// router.post("/tenant/idp-config", internalAuth, async (req, res) => {
//     try {
//         const { tenantCode } = req.body;

//         if (!tenantCode) {
//             return res.status(400).json({ error: "tenantCode required" });
//         }

//         // 1️⃣ Find tenant
//         const tenant = await prisma.tenant.findUnique({
//             where: { tenantCode },
//             include: { tenant_api_table: true },
//         });

//         if (!tenant || !tenant.isActive) {
//             return res.status(404).json({ error: "Tenant not found or inactive" });
//         }

//         // 2️⃣ Find IdP config (Keycloak)
//         const apiConfig = tenant.tenant_api_table.find(
//             (c) => c.idpType === "keycloak"
//         );

//         if (!apiConfig) {
//             return res.status(400).json({ error: "IdP not configured for tenant" });
//         }

//         // 3️⃣ Return only what is needed
//         res.json({
//             tenantId: tenant.id,
//             idpType: apiConfig.idpType,
//             issuerUrl: apiConfig.idpIssuerUrl,
//             clientId: apiConfig.idpClientId,
//             clientSecret: apiConfig.idpClientSecret,
//             tokenUrl:
//                 apiConfig.idpTokenUrl ||
//                 `${apiConfig.idpIssuerUrl}/protocol/openid-connect/token`,
//         });
//     } catch (err) {
//         console.error("HRM IdP config error:", err);
//         res.status(500).json({ error: "Internal server error" });
//     }
// });

router.post("/tenant/idp-config-by-email", internalAuth, async (req, res) => {
    try {
        const { email } = req.body;
        console.log("idp-config-by-email request for:", email);

        if (!email) {
            return res.status(400).json({ error: "email required" });
        }

        // 1️⃣ Find user by login/work email
        //    Also join employeeProfile to get their real personal Gmail
        const user = await prisma.user.findFirst({
            where: {
                email,
                isActive: true,   // only allow active users to log in
            },
            select: {
                tenantId: true,
                employeeProfile: {          // ← lowercase 'e' — matches your schema relation name
                    select: {
                        personalEmail: true,    // ← the real Gmail for notifications
                    },
                },
            },
        });

        console.log("HRM user lookup result:", user);

        if (!user || !user.tenantId) {
            // ⚠️ Generic error — never reveal "email not found" (prevents user enumeration)
            return res.status(404).json({ error: "Invalid credentials" });
        }

        // 2️⃣ Find the tenant and its Keycloak config
        const tenant = await prisma.tenant.findUnique({
            where: { id: user.tenantId },
            include: { tenant_api_table: true },
        });

        if (!tenant || !tenant.isActive) {
            return res.status(404).json({ error: "Invalid credentials" });
        }

        // 3️⃣ Find the Keycloak IdP config entry
        const apiConfig = tenant.tenant_api_table.find(
            (c) => c.idpType === "keycloak"
        );

        if (!apiConfig) {
            return res.status(400).json({ error: "IdP not configured for tenant" });
        }

        // 4️⃣ Return everything FlowDash needs
        //    personalEmail is passed so FlowDash can store it and
        //    send all notifications to the real inbox, not the work email
        res.json({
            tenantId: tenant.id,
            idpType: apiConfig.idpType,
            issuerUrl: apiConfig.idpIssuerUrl,
            clientId: apiConfig.idpClientId,
            clientSecret: apiConfig.idpClientSecret,
            tokenUrl:
                apiConfig.idpTokenUrl ||
                `${apiConfig.idpIssuerUrl}/protocol/openid-connect/token`,
            personalEmail: user.employeeProfile?.personalEmail ?? null,  // ← real Gmail
        });

    } catch (err) {
        console.error("HRM idp-config-by-email error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
