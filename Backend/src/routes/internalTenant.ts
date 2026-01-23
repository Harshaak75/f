// routes/internalTenant.ts
import { Router } from "express";
import { internalAuth } from "../middleware/internalAuth";
import prisma from "../prisma/client";

const router = Router();

/**
 * POST /internal/tenant/idp-config
 */
router.post("/tenant/idp-config", internalAuth, async (req, res) => {
    try {
        const { tenantCode } = req.body;

        if (!tenantCode) {
            return res.status(400).json({ error: "tenantCode required" });
        }

        // 1️⃣ Find tenant
        const tenant = await prisma.tenant.findUnique({
            where: { tenantCode },
            include: { tenant_api_table: true },
        });

        if (!tenant || !tenant.isActive) {
            return res.status(404).json({ error: "Tenant not found or inactive" });
        }

        // 2️⃣ Find IdP config (Keycloak)
        const apiConfig = tenant.tenant_api_table.find(
            (c) => c.idpType === "keycloak"
        );

        if (!apiConfig) {
            return res.status(400).json({ error: "IdP not configured for tenant" });
        }

        // 3️⃣ Return only what is needed
        res.json({
            tenantId: tenant.id,
            idpType: apiConfig.idpType,
            issuerUrl: apiConfig.idpIssuerUrl,
            clientId: apiConfig.idpClientId,
            clientSecret: apiConfig.idpClientSecret,
            tokenUrl:
                apiConfig.idpTokenUrl ||
                `${apiConfig.idpIssuerUrl}/protocol/openid-connect/token`,
        });
    } catch (err) {
        console.error("HRM IdP config error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
