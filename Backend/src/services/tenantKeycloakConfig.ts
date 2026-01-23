import prisma from "../prisma/client";


export async function getTenantKeycloakConfig(tenantId: string) {
  const config = await prisma.tenant_api_table.findFirst({
    where: {
      tenantId,
      idpType: "keycloak",
    },
  });

  if (!config) {
    throw new Error(`Keycloak configuration not found for tenant ${tenantId}`);
  }

  if (!config.idpClientId || !config.idpClientSecret || !config.idpIssuerUrl) {
    throw new Error("Incomplete Keycloak configuration for tenant");
  }

  const parts = config.idpIssuerUrl.split("/realms/");
  if (parts.length !== 2) {
    throw new Error("Invalid Keycloak issuer URL format");
  }

  const realm = parts[1];

  return {
    realm,
    clientId: config.idpClientId,
    clientSecret: config.idpClientSecret,
    issuerUrl: config.idpIssuerUrl,
    tokenUrl:
      config.idpTokenUrl ??
      `${config.idpIssuerUrl}/protocol/openid-connect/token`,
    adminBaseUrl: parts[0], // safer than replace()
  };
}


