import { useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { cn } from "../../lib/utils";
import { useToast } from "../../hooks/use-toast";

import {
  employeeFunctionalityService,
  type CreateOnboardingPayload,
  type DocumentItem,
  type OfferPayload,
  type AssetPayload,
} from "../../utils/api/Admin.employeeFunctionality";
import { useNavigate } from "react-router-dom";

const steps = [
  { id: 1, title: "Basic Info" },
  { id: 2, title: "Documents & KYC" },
  { id: 3, title: "Offer & E-sign" },
  { id: 4, title: "Assets" },
  { id: 5, title: "Orientation" },
  { id: 6, title: "Complete" },
];

const initialBasic: CreateOnboardingPayload = {
  email: "",
  name: "",
  password: "",
  firstName: "",
  lastName: "",
  personalEmail: "",
  phone: "",
  employeeId: "",
  altPhone: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  designation: "",
  joiningDate: "", // yyyy-mm-dd
  employeeType: "", // full-time | part-time | contractor
  dateOfBirth: "", // yyyy-mm-dd
};

type DocsState = {
  aadhar: File[];
  pan: File[];
  bank: File[];
  education: File[];
};

const initialDocs: DocsState = {
  aadhar: [],
  pan: [],
  bank: [],
  education: [],
};

const initialOffer: OfferPayload = {
  roleTitle: "",
  annualCTC: "",
  basic: "",
  hra: "",
  da: "",
  specialAllowance: "",
  grossSalary: "",
  pfDeduction: "",
  tax: "",
  netSalary: "",
};

const initialAssets = {
  laptopBrand: "",
  laptopModel: "",
  serialNumber: "",
  esiNumber: "",
  pfNumber: "",
  insuranceNumber: "",
  companyEmail: "",
  idNumber: "",
  simNumber: "",
};

export default function EmployeeOnboarding() {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Step 1 state (CreateOnboardingPayload)
  const [basic, setBasic] = useState<CreateOnboardingPayload>({
    email: "",
    name: "",
    password: "", // required by your backend
    firstName: "",
    lastName: "",
    personalEmail: "",
    phone: "",
    employeeId: "",
    altPhone: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    designation: "",
    joiningDate: "", // yyyy-mm-dd
    employeeType: "", // full-time | part-time | contractor
    dateOfBirth: "", // yyyy-mm-dd
  });

  // Step 1 -> we need this for subsequent steps
  const [profileId, setProfileId] = useState<string | null>(null);

  // Step 2 state (Document uploads)
  const [docs, setDocs] = useState<DocsState>({
    aadhar: [],
    pan: [],
    bank: [],
    education: [],
  });

  // Step 3 state (Offer)
  const [offer, setOffer] = useState<OfferPayload>({
    roleTitle: "",
    annualCTC: "",
    basic: "",
    hra: "",
    da: "",
    specialAllowance: "",
    grossSalary: "",
    pfDeduction: "",
    tax: "",
    netSalary: "",
  });

  // Step 4 state (Assets)
  const [assets, setAssets] = useState({
    laptopBrand: "",
    laptopModel: "",
    serialNumber: "",
    esiNumber: "",
    pfNumber: "",
    insuranceNumber: "",
    companyEmail: "",
    idNumber: "",
    simNumber: "",
  });

  const handleFinish = async () => {
    try {
      setLoading(true);
      // (Optional) You could call a finalize endpoint here if you add one.

      toast({
        title: "Onboarding Complete",
        description: "All steps finished successfully.",
      });

      // Reset all local state
      setBasic(initialBasic);
      setDocs(initialDocs);
      setOffer(initialOffer);
      setAssets(initialAssets);
      setProfileId(null);
      setCurrentStep(1);

      // Go back to previous page (or navigate to a dashboard if you prefer)
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    try {
      setLoading(true);

      // STEP 1 -> Create Onboarding
      if (currentStep === 1) {
        if (
          !basic.firstName ||
          !basic.lastName ||
          !basic.email ||
          !basic.password ||
          !basic.phone ||
          !basic.designation ||
          !basic.joiningDate ||
          !basic.employeeType ||
          !basic.dateOfBirth
        ) {
          throw new Error("Please fill all required fields in Basic Info.");
        }

        const created = await employeeFunctionalityService.createOnboarding(
          basic
        );
        const pid = created?.profile?.id;
        if (!pid) throw new Error("Profile ID missing from response.");
        setProfileId(pid);

        toast({
          title: "Basic info saved",
          description: "Profile created/resumed successfully.",
        });
      }

      // STEP 2 -> Upload multiple documents (batch)
      if (currentStep === 2) {
        if (!profileId) throw new Error("Profile not created yet.");

        const items: DocumentItem[] = [];
        docs.aadhar.forEach((f) =>
          items.push({ documentType: "Aadhar Card", file: f })
        );
        docs.pan.forEach((f) =>
          items.push({ documentType: "PAN Card", file: f })
        );
        docs.bank.forEach((f) =>
          items.push({ documentType: "Bank Proof", file: f })
        );
        docs.education.forEach((f) =>
          items.push({ documentType: "Education Certificates", file: f })
        );

        await employeeFunctionalityService.saveDocumentMeta(profileId, items);
        toast({
          title: "Documents uploaded",
          description: "All selected files were uploaded.",
        });
      }

      // STEP 3 -> Save Offer
      if (currentStep === 3) {
        if (!profileId) throw new Error("Profile not created yet.");

        if (
          !offer.roleTitle ||
          !offer.annualCTC ||
          !offer.basic ||
          !offer.hra ||
          !offer.grossSalary ||
          !offer.pfDeduction ||
          !offer.tax ||
          !offer.netSalary
        ) {
          throw new Error("Please fill all required fields in Offer.");
        }

        await employeeFunctionalityService.saveOffer(profileId, {
          ...offer,
          da: offer.da || "0",
          specialAllowance: offer.specialAllowance || "0",
        });

        toast({
          title: "Offer saved",
          description: "Offer details stored successfully.",
        });
      }

      // STEP 4 -> Save Assets (send only filled ones)
      if (currentStep === 4) {
        if (!profileId) throw new Error("Profile not created yet.");

        const batch: AssetPayload[] = [];

        if (assets.laptopBrand || assets.laptopModel || assets.serialNumber) {
          batch.push({
            assetType: "Laptop",
            brand: assets.laptopBrand,
            model: assets.laptopModel,
            serialNumber: assets.serialNumber,
          });
        }
        if (assets.esiNumber)
          batch.push({ assetType: "ESI", esiNumber: assets.esiNumber });
        if (assets.pfNumber)
          batch.push({ assetType: "PF", pfNumber: assets.pfNumber });
        if (assets.insuranceNumber)
          batch.push({
            assetType: "INSURANCE",
            insuranceNumber: assets.insuranceNumber,
          });
        if (assets.companyEmail)
          batch.push({
            assetType: "COMPANY_EMAIL",
            companyEmail: assets.companyEmail,
          });
        if (assets.idNumber)
          batch.push({ assetType: "COMPANY_ID", idNumber: assets.idNumber });
        if (assets.simNumber)
          batch.push({ assetType: "SIM", simNumber: assets.simNumber });

        if (batch.length) {
          for (const item of batch) {
            await employeeFunctionalityService.saveAsset(profileId, item);
          }
        }

        toast({
          title: "Assets saved",
          description: "Assets assigned successfully.",
        });
      }

      // Move to next step OR finish
      if (currentStep < steps.length) {
        const next = currentStep + 1;
        setCurrentStep(next);

        // If the next step is the last one (Complete), you can toast here
        if (next === steps.length) {
          toast({
            title: "Employee Onboarded Successfully! 🎉",
            description: "The new employee has been added to the system.",
          });
        }
      } else {
        // Already on last step -> do finish behavior
        await handleFinish();
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Something went wrong. Please try again.";
      toast({
        title: "Action failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1 && !loading) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-semibold">Employee Onboarding</h1>
        <p className="text-muted-foreground mt-1">
          Complete all steps to onboard a new employee
        </p>
      </div>

      {/* Stepper */}
      <Card className="card-shadow">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center font-medium transition-colors",
                      currentStep > step.id
                        ? "bg-primary text-primary-foreground"
                        : currentStep === step.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground"
                    )}
                  >
                    {currentStep > step.id ? <Check size={20} /> : step.id}
                  </div>
                  <div className="text-xs font-medium mt-2 text-center">
                    {step.title}
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "h-1 flex-1 mx-2 transition-colors",
                      currentStep > step.id ? "bg-primary" : "bg-secondary"
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Form Content */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle>{steps[currentStep - 1].title}</CardTitle>
        </CardHeader>
        <CardContent>
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {currentStep === 1 && (
              <BasicInfoForm basic={basic} setBasic={setBasic} />
            )}
            {currentStep === 2 && (
              <DocumentsForm docs={docs} setDocs={setDocs} />
            )}
            {currentStep === 3 && (
              <OfferForm offer={offer} setOffer={setOffer} />
            )}
            {currentStep === 4 && (
              <AssetsForm assets={assets} setAssets={setAssets} />
            )}
            {currentStep === 5 && <OrientationForm />}
            {currentStep === 6 && <CompletionForm />}
          </motion.div>

          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={handlePrev}
              disabled={currentStep === 1 || loading}
            >
              Previous
            </Button>
            <Button
              onClick={currentStep === steps.length ? handleFinish : handleNext}
              disabled={loading}
              className={cn(loading && "opacity-70 cursor-not-allowed")}
            >
              {currentStep === steps.length
                ? loading
                  ? "Finishing..."
                  : "Finish"
                : loading
                ? "Saving..."
                : "Next"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* -------------------- Step 1 -------------------- */
function BasicInfoForm({
  basic,
  setBasic,
}: {
  basic: CreateOnboardingPayload;
  setBasic: React.Dispatch<React.SetStateAction<CreateOnboardingPayload>>;
}) {
  const set = (k: keyof CreateOnboardingPayload) => (e: any) =>
    setBasic((s) => ({ ...s, [k]: e.target ? e.target.value : e }));

  return (
    <div className="space-y-4">
      {/* Name + Email + Password */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>First Name *</Label>
          <Input
            value={basic.firstName}
            onChange={set("firstName")}
            placeholder="Enter first name"
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
          />
        </div>
        <div>
          <Label>Last Name *</Label>
          <Input
            value={basic.lastName}
            onChange={set("lastName")}
            placeholder="Enter last name"
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Display Name *</Label>
          <Input
            value={basic.name}
            onChange={set("name")}
            placeholder="e.g., John Doe"
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
          />
        </div>
        <div>
          <Label>Email *</Label>
          <Input
            type="email"
            value={basic.email}
            onChange={set("email")}
            placeholder="employee@dotspeaks.com"
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Password *</Label>
          <Input
            type="password"
            value={basic.password}
            onChange={set("password")}
            placeholder="••••••••"
            autoCapitalize="none"
            autoComplete="new-password"
            autoCorrect="off"
          />
        </div>
        <div>
          <Label>Personal Email</Label>
          <Input
            value={basic.personalEmail || ""}
            onChange={set("personalEmail")}
            placeholder="john@gmail.com"
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
          />
        </div>
      </div>

      {/* Phones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Phone *</Label>
          <Input
            value={basic.phone}
            onChange={set("phone")}
            placeholder="+91 98765 43210"
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
          />
        </div>
        <div>
          <Label>Alternate Phone</Label>
          <Input
            value={basic.altPhone || ""}
            onChange={set("altPhone")}
            placeholder="+91 90000 00000"
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
          />
        </div>
      </div>

      {/* Emergency */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Emergency Contact Name</Label>
          <Input
            value={basic.emergencyContactName || ""}
            onChange={set("emergencyContactName")}
            placeholder="Guardian name"
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
          />
        </div>
        <div>
          <Label>Emergency Contact Phone</Label>
          <Input
            value={basic.emergencyContactPhone || ""}
            onChange={set("emergencyContactPhone")}
            placeholder="+91 9xxxx xxxxx"
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
          />
        </div>
      </div>

      {/* Employment */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Designation *</Label>
          <Input
            value={basic.designation}
            onChange={set("designation")}
            placeholder="Software Engineer"
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
          />
        </div>
        <div>
          <Label>Employee ID</Label>
          <Input
            value={basic.employeeId || ""}
            onChange={set("employeeId")}
            placeholder="EMP-001"
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
          />
        </div>
      </div>

      {/* Dates & Type */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Joining Date *</Label>
          <Input
            type="date"
            value={basic.joiningDate}
            onChange={set("joiningDate")}
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
          />
        </div>
        <div>
          <Label>Date of Birth *</Label>
          <Input
            type="date"
            value={basic.dateOfBirth}
            onChange={set("dateOfBirth")}
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Employee Type *</Label>
          <Select
            value={basic.employeeType}
            onValueChange={(v) => setBasic((s) => ({ ...s, employeeType: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="full-time">Full-time</SelectItem>
              <SelectItem value="part-time">Part-time</SelectItem>
              <SelectItem value="contractor">Contractor</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

/* -------------------- Step 2 -------------------- */
function DocumentsForm({
  docs,
  setDocs,
}: {
  docs: DocsState;
  setDocs: React.Dispatch<React.SetStateAction<DocsState>>;
}) {
  const onPick =
    (key: keyof DocsState) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      setDocs((s) => ({ ...s, [key]: [...(s[key] || []), ...files] }));
    };

  const removeOne = (key: keyof DocsState, index: number) => () => {
    setDocs((s) => {
      const copy = [...s[key]];
      copy.splice(index, 1);
      return { ...s, [key]: copy };
    });
  };

  const renderPicker = (
    label: string,
    key: keyof DocsState,
    accept = ".pdf,.jpg,.jpeg,.png"
  ) => (
    <div className="border border-dashed border-border rounded-lg p-4 space-y-2">
      <Label className="font-medium">{label}</Label>
      <Input type="file" multiple accept={accept} onChange={onPick(key)} />
      {docs[key]?.length ? (
        <div className="text-xs text-muted-foreground">
          {docs[key].map((f, idx) => (
            <div
              key={`${f.name}-${idx}`}
              className="flex items-center justify-between py-1"
            >
              <span className="truncate mr-2">{f.name}</span>
              <button
                type="button"
                onClick={removeOne(key, idx)}
                className="text-red-600 hover:underline"
              >
                remove
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Upload required documents (PDF/JPG/PNG). You can add multiple files per
        category.
      </p>
      <div className="space-y-4">
        {renderPicker("Aadhar Card", "aadhar")}
        {renderPicker("PAN Card", "pan")}
        {renderPicker("Bank Proof", "bank")}
        {renderPicker("Education Certificates", "education")}
      </div>
    </div>
  );
}

/* -------------------- Step 3 -------------------- */
function OfferForm({
  offer,
  setOffer,
}: {
  offer: OfferPayload;
  setOffer: React.Dispatch<React.SetStateAction<OfferPayload>>;
}) {
  const set = (k: keyof OfferPayload) => (e: any) =>
    setOffer((s) => ({ ...s, [k]: e.target.value }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Role Title *</Label>
          <Input
            value={offer.roleTitle as any}
            onChange={set("roleTitle")}
            placeholder="Senior Software Engineer"
          />
        </div>
        <div>
          <Label>Annual CTC (₹) *</Label>
          <Input
            type="number"
            value={offer.annualCTC as any}
            onChange={set("annualCTC")}
            placeholder="1200000"
          />
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t">
        <h3 className="text-lg font-medium">Monthly Salary Breakdown (₹)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Basic Salary *</Label>
            <Input
              type="number"
              value={offer.basic as any}
              onChange={set("basic")}
              placeholder="50000"
              autoCapitalize="none"
              autoComplete="off"
              autoCorrect="off"
            />
          </div>
          <div>
            <Label>HRA *</Label>
            <Input
              type="number"
              value={offer.hra as any}
              onChange={set("hra")}
              placeholder="20000"
              autoCapitalize="none"
              autoComplete="off"
              autoCorrect="off"
            />
          </div>
          <div>
            <Label>DA</Label>
            <Input
              type="number"
              value={offer.da as any}
              onChange={set("da")}
              placeholder="0"
              autoCapitalize="none"
              autoComplete="off"
              autoCorrect="off"
            />
          </div>
          <div>
            <Label>Special Allowance *</Label>
            <Input
              type="number"
              value={offer.specialAllowance as any}
              onChange={set("specialAllowance")}
              placeholder="10000"
              autoCapitalize="none"
              autoComplete="off"
              autoCorrect="off"
            />
          </div>
        </div>

        <div>
          <Label>Gross Salary (Monthly) *</Label>
          <Input
            type="number"
            value={offer.grossSalary as any}
            onChange={set("grossSalary")}
            placeholder="80000"
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
          />
        </div>

        <h4 className="text-md font-medium pt-2">Monthly Deductions (₹)</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>PF Deduction *</Label>
            <Input
              type="number"
              value={offer.pfDeduction as any}
              onChange={set("pfDeduction")}
              placeholder="1800"
              autoCapitalize="none"
              autoComplete="off"
              autoCorrect="off"
            />
          </div>
          <div>
            <Label>Tax (TDS) *</Label>
            <Input
              type="number"
              value={offer.tax as any}
              onChange={set("tax")}
              placeholder="5000"
              autoCapitalize="none"
              autoComplete="off"
              autoCorrect="off"
            />
          </div>
        </div>

        <div>
          <Label>Net Salary (Monthly) *</Label>
          <Input
            type="number"
            value={offer.netSalary as any}
            onChange={set("netSalary")}
            placeholder="73200"
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
          />
        </div>
      </div>
    </div>
  );
}

/* -------------------- Step 4 -------------------- */
function AssetsForm({
  assets,
  setAssets,
}: {
  assets: {
    laptopBrand: string;
    laptopModel: string;
    serialNumber: string;
    esiNumber: string;
    pfNumber: string;
    insuranceNumber: string;
    companyEmail: string;
    idNumber: string;
    simNumber: string;
  };
  setAssets: React.Dispatch<
    React.SetStateAction<{
      laptopBrand: string;
      laptopModel: string;
      serialNumber: string;
      esiNumber: string;
      pfNumber: string;
      insuranceNumber: string;
      companyEmail: string;
      idNumber: string;
      simNumber: string;
    }>
  >;
}) {
  const set = (k: keyof typeof assets) => (e: any) =>
    setAssets((s) => ({ ...s, [k]: e.target.value }));

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Assign company assets to the new employee
      </p>
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Laptop Brand</Label>
            <Input
              value={assets.laptopBrand}
              onChange={set("laptopBrand")}
              placeholder="e.g., Dell"
              autoCapitalize="none"
              autoComplete="off"
              autoCorrect="off"
            />
          </div>
          <div>
            <Label>Laptop Model</Label>
            <Input
              value={assets.laptopModel}
              onChange={set("laptopModel")}
              placeholder="e.g., XPS 15"
              autoCapitalize="none"
              autoComplete="off"
              autoCorrect="off"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>ESI Number *</Label>
            <Input
              value={assets.esiNumber}
              onChange={set("esiNumber")}
              placeholder=""
              autoCapitalize="none"
              autoComplete="off"
              autoCorrect="off"
            />
          </div>
          <div>
            <Label>PF Number *</Label>
            <Input
              value={assets.pfNumber}
              onChange={set("pfNumber")}
              placeholder=""
              autoCapitalize="none"
              autoComplete="off"
              autoCorrect="off"
            />
          </div>
          <div>
            <Label>Insurance Number *</Label>
            <Input
              value={assets.insuranceNumber}
              onChange={set("insuranceNumber")}
              placeholder=""
              autoCapitalize="none"
              autoComplete="off"
              autoCorrect="off"
            />
          </div>
          <div>
            <Label>Serial Number</Label>
            <Input
              value={assets.serialNumber}
              onChange={set("serialNumber")}
              placeholder="e.g., ABC123XYZ"
              autoCapitalize="none"
              autoComplete="off"
              autoCorrect="off"
            />
          </div>
          <div>
            <Label>Company Email *</Label>
            <Input
              value={assets.companyEmail}
              onChange={set("companyEmail")}
              placeholder=""
              autoCapitalize="none"
              autoComplete="off"
              autoCorrect="off"
            />
          </div>
          <div>
            <Label>ID Number *</Label>
            <Input
              value={assets.idNumber}
              onChange={set("idNumber")}
              placeholder=""
              autoCapitalize="none"
              autoComplete="off"
              autoCorrect="off"
            />
          </div>
        </div>

        <div>
          <Label>SIM Card Number</Label>
          <Input
            value={assets.simNumber}
            onChange={set("simNumber")}
            placeholder="e.g., +91 98765 00000"
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
          />
        </div>
      </div>
    </div>
  );
}

/* -------------------- Step 5 -------------------- */
function OrientationForm() {
  const checklistItems = [
    "Complete IT security training",
    "Review company policies",
    "Setup email and accounts",
    "Meet team members",
    "Software Account Creation",
    "Tour office facilities",
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Track completion of orientation activities
      </p>
      <div className="space-y-3">
        {checklistItems.map((item, index) => (
          <label
            key={index}
            className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-secondary cursor-pointer transition-colors"
          >
            <input type="checkbox" className="w-4 h-4" />
            <span>{item}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

/* -------------------- Step 6 -------------------- */
function CompletionForm() {
  return (
    <div className="text-center space-y-4 py-8">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
        <Check size={32} className="text-green-600" />
      </div>
      <h3 className="text-xl font-semibold">Onboarding Complete!</h3>
      <p className="text-muted-foreground">
        The employee has been successfully added to the system.
      </p>
    </div>
  );
}
