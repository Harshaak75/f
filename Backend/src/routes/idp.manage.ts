import { Router } from "express";
import { protect } from "../middleware/auth.middleware";
import prisma from "../prisma/client";
import { Role } from "@prisma/client";
import jwt from "jsonwebtoken";
import axios from "axios";
import jwksClient from "jwks-rsa";

const router = Router();

// router.get("/login/sso/:tenantCode", async (req, res) => {
//   try {
//     const { tenantCode } = req.params;

//     if (!tenantCode) {
//       res.status(500).json({ message: "The tenantCode is not found" });
//     }

//     const tenant = await prisma.tenant.findUnique({
//       where: { tenantCode },
//       include: { tenant_api_table: true },
//     });

//     if (!tenant) return res.status(404).send("Tenant not found");

//     const apiConfig = tenant.tenant_api_table[0];
//     if (!apiConfig)
//       return res.status(400).send("IdP not configured for tenant");

//     const keycloakBase = apiConfig.idpIssuerUrl; // e.g. http://localhost:8080/realms/DotSpeaks01
//     const keycloakAuthUrl = `${keycloakBase}/protocol/openid-connect/auth`;

//     const redirectUri = encodeURIComponent(
//       `http://localhost:5000/api/tenant/callback`
//     );
//     const authUrl = `${keycloakAuthUrl}?client_id=${apiConfig.idpClientId}&response_type=code&redirect_uri=${redirectUri}&scope=openid email profile`;

//     return res.redirect(authUrl);
//   } catch (error) {}
// });

// router.get("/callback", async (req, res) => {
//   const { code, tenantCode } = req.query;

//   const tenant = await prisma.tenant.findUnique({
//     where: { tenantCode: String(tenantCode) },
//     include: { tenant_api_table: true },
//   });
//   const apiConfig = tenant?.tenant_api_table[0];
//   if (!apiConfig) return res.status(400).send("Invalid tenant");

//   // Exchange code for token
//   const params = new URLSearchParams({
//     grant_type: "authorization_code",
//     code: String(code),
//     redirect_uri: "http://localhost:5000/api/tenant/callback",
//     client_id: apiConfig.idpClientId ?? "",
//     client_secret: apiConfig.idpClientSecret ?? "",
//   });

//   if (!apiConfig.idpTokenUrl) {
//     return res.status(500).json({ message: "The idpTokenUrl not found" });
//   }

//   const tokenRes = await axios.post(apiConfig.idpTokenUrl, params);
//   const { access_token } = tokenRes.data;

//   // Decode
//   const decoded = jwt.decode(access_token);
//   const { sub, email, name } = decoded as any;

//   // Link or create user
//   let ext = await prisma.externalIdentity.findUnique({ where: { email } });
//   if (!ext) {
//     const user = await prisma.user.create({
//       data: {
//         email,
//         name: name || email,
//         password: "",
//         role: "EMPLOYEE",
//         tenantId: tenant!.id,
//       },
//     });

//     ext = await prisma.externalIdentity.create({
//       data: {
//         provider: apiConfig.idpType,
//         subject: sub,
//         email,
//         tenantId: tenant!.id,
//         userId: user.id,
//       },
//     });
//   }

//   // Generate session
//   const appJwt = jwt.sign(
//     { userId: ext.userId, tenantId: tenant!.id, email },
//     process.env.JWT_SECRET!,
//     { expiresIn: "1d" }
//   );

//   res.redirect(`http:localhost:8081/employee`);
// });

router.post("/create/tenantApi", protect, async (req, res) => {
  try {
    const {
      idpType,
      idpIssuerUrl,
      idpClientId,
      idpClientSecret,
      idpAuthUrl,
      idpTokenUrl,
    } = req.body;
    const { tenantId } = req.user!;

    if (
      !idpType ||
      !idpIssuerUrl ||
      !idpClientId ||
      !idpClientSecret ||
      !tenantId
    ) {
      return res.status(500).json({ message: "Provide the data" });
    }

    await prisma.tenant_api_table.create({
      data: {
        tenantId: tenantId,
        idpAuthUrl: idpAuthUrl || "",
        idpClientId,
        idpClientSecret,
        idpIssuerUrl,
        idpTokenUrl: idpTokenUrl || "",
        idpType,
      },
    });

    res.status(200).json({ message: "The tenant api table created" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "The tenant api table not created", error });
  }
});

router.get("/sso-login/:tenantCode", async (req, res) => {
  const { tenantCode } = req.params;
  const { token }: any = req.query; // or Authorization header

  const tenant = await prisma.tenant.findUnique({
    where: { tenantCode },
    include: { tenant_api_table: true },
  });
  const apiConfig = tenant?.tenant_api_table[0];
  if (!apiConfig) return res.status(400).send("IdP not configured");

  // Verify Keycloak token using JWKS endpoint
  const client = jwksClient({
    jwksUri: `${apiConfig.idpIssuerUrl}/protocol/openid-connect/certs`,
  });

  const decodedHeader: any = jwt.decode(token, { complete: true });
  const key = await client.getSigningKey(decodedHeader.header.kid);
  const publicKey = key.getPublicKey();

  const verified = jwt.verify(token, publicKey);

  const { sub, email, given_name } = verified as any;

  // Find or create user in your system
  // --- Check if an ExternalIdentity already exists ---
  let ext: any = await prisma.externalIdentity.findUnique({
    where: { email },
    include: { user: true },
  });

  if (!ext) {
    // --- If not, check if a User already exists ---
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // ✅ Create a new User only if it doesn't exist
      user = await prisma.user.create({
        data: {
          email,
          name: given_name || email,
          password: "", // no password; Keycloak handles auth
          role: "EMPLOYEE",
          tenantId: tenant.id,
        },
      });
    }

    // ✅ Create ExternalIdentity record linking to user
    ext = await prisma.externalIdentity.create({
      data: {
        provider: apiConfig.idpType,
        subject: sub,
        email,
        tenantId: tenant.id,
        userId: user.id,
      },
    });
  }

  const hrmJwt = jwt.sign(
    {
      userId: ext.userId,
      tenantId: tenant.id,
      email,
      name: given_name || email,
    },
    process.env.JWT_SECRET!,
    { expiresIn: "1d" }
  );

  // ✅ Store HRM JWT in secure cookie
  res.cookie("token", hrmJwt, {
    httpOnly: true,
    secure: false, // set true in production (HTTPS)
    sameSite: "lax",
    maxAge: 24 * 60 * 60 * 1000,
  });
  // res.redirect(`http://localhost:8081/employee`);
  res.redirect("http://localhost:8082/employee");
});

export default router;
