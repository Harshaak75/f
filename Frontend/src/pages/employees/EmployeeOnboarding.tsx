// EmployeeOnboarding.tsx
import React, { useEffect, useMemo, useState } from "react";
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

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  basicInfoSchema,
  documentsSchema,
  offerSchema,
  assetsSchema,
} from "../../lib/onboardingSchemas";
import { z } from "zod";

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
  accessRole: "OPERATOR",
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

  // Parent-held state (synchronized by forms)
  const [basic, setBasic] = useState<CreateOnboardingPayload>(initialBasic);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [docs, setDocs] = useState<DocsState>(initialDocs);
  const [offer, setOffer] = useState<OfferPayload>(initialOffer);
  const [assets, setAssets] = useState(() => ({ ...initialAssets }));


  // per-step validity state (controls Next button)
  const [isStepValid, setIsStepValid] = useState(false);

  // Reset step validity when step changes (forms will update it on mount)
  useEffect(() => setIsStepValid(false), [currentStep]);

  // handle finish (same as your original)
  const handleFinish = async () => {
    try {
      setLoading(true);

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

      navigate(-1);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    // Documents step is optional → always valid
    setIsStepValid(true);
  }, [isStepValid]);

  // Enhanced handleNext: also prevents skipping when step invalid
  const handleNext = async () => {
    // If UI shows disabled but user triggers this, enforce guard (Option C)
    if (!isStepValid) {
      toast({
        title: "Fix errors before continuing",
        description:
          "Please resolve validation errors in the current step to continue.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // STEP 1 -> Create Onboarding
      if (currentStep === 1) {
        // additional runtime guard (mirrors Zod checks)
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
      // STEP 2 -> Upload multiple documents (optional)
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

        // 🔑 KEY FIX: skip upload if no documents
        if (items.length === 0) {
          toast({
            title: "Documents skipped",
            description: "No documents were uploaded. You can add them later.",
          });
        } else {
          await employeeFunctionalityService.saveDocumentMeta(profileId, items);

          toast({
            title: "Documents uploaded",
            description: "All selected files were uploaded.",
          });
        }
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

      // STEP 4 -> Save Assets
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
              <BasicInfoForm
                basic={basic}
                setBasic={setBasic}
                onValidityChange={setIsStepValid}
              />
            )}
            {currentStep === 2 && (
              <DocumentsForm
                docs={docs}
                setDocs={setDocs}
                onValidityChange={setIsStepValid}
              />
            )}
            {currentStep === 3 && (
              <OfferForm
                offer={offer}
                setOffer={setOffer}
                onValidityChange={setIsStepValid}
              />
            )}
            {currentStep === 4 && (
              <AssetsForm
                assets={assets}
                setAssets={setAssets}
                onValidityChange={setIsStepValid}
              />
            )}
            {currentStep === 5 && <OrientationForm onValidityChange={setIsStepValid} />}
            {currentStep === 6 && <CompletionForm />}
          </motion.div>

          <div className="flex justify-between mt-8">
            {/* Hide Previous on Step 6 */}
            {currentStep !== 6 ? (
              <Button
                variant="outline"
                onClick={handlePrev}
                disabled={currentStep === 1 || loading}
              >
                Previous
              </Button>
            ) : (
              <div /> /* keeps spacing balanced */
            )}

            <Button
              onClick={currentStep === steps.length ? handleFinish : handleNext}
              disabled={
                currentStep === 6
                  ? loading // Step 6: only disable if loading
                  : !isStepValid || loading // Steps 1–5: validation controls disabled state
              }
              className={cn(
                (loading || (currentStep !== 6 && !isStepValid)) &&
                "opacity-70 cursor-not-allowed"
              )}
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


/* -------------------- Step 1 -------------------- */

function BasicInfoForm({
  basic,
  setBasic,
  onValidityChange,
}: {
  basic: CreateOnboardingPayload;
  setBasic: React.Dispatch<React.SetStateAction<CreateOnboardingPayload>>;
  onValidityChange: (v: boolean) => void;
}) {
  // Create typed form from Zod schema
  type BasicFormType = z.infer<typeof basicInfoSchema>;

  const {
    register,
    control,
    watch,
    formState: { errors, isValid, isSubmitted },
  } = useForm<BasicFormType>({
    resolver: zodResolver(basicInfoSchema),
    mode: "onChange",
    defaultValues: {
      firstName: basic.firstName,
      lastName: basic.lastName,
      name: basic.name,
      email: basic.email,
      password: basic.password,
      personalEmail: basic.personalEmail || "",
      phone: basic.phone,
      altPhone: basic.altPhone || "",
      emergencyContactName: basic.emergencyContactName || "",
      emergencyContactPhone: basic.emergencyContactPhone || "",
      designation: basic.designation,
      employeeId: basic.employeeId || "",
      joiningDate: basic.joiningDate,
      dateOfBirth: basic.dateOfBirth,
      employeeType: basic.employeeType as any,
      accessRole: basic.accessRole,
    },
  });



  // sync validity up
  useEffect(() => {
    onValidityChange(isValid);
  }, [isValid, onValidityChange]);

  // sync form values to parent
  useEffect(() => {
    const sub = watch((values) => {
      setBasic((s) => ({
        ...s,
        firstName: values.firstName ?? "",
        lastName: values.lastName ?? "",
        name: values.name ?? "",
        email: values.email ?? "",
        password: values.password ?? "",
        personalEmail: values.personalEmail ?? "",
        phone: values.phone ?? "",
        altPhone: values.altPhone ?? "",
        emergencyContactName: values.emergencyContactName ?? "",
        emergencyContactPhone: values.emergencyContactPhone ?? "",
        designation: values.designation ?? "",
        employeeId: values.employeeId ?? "",
        joiningDate: values.joiningDate ?? "",
        dateOfBirth: values.dateOfBirth ?? "",
        employeeType: (values.employeeType as any) ?? "",
        accessRole: values.accessRole ?? "OPERATOR",
      }));
    });
    return () => sub.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watch]);

  return (
    <div className="space-y-4">
      {/* Name + Email + Password */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>First Name *</Label>
          <input
            {...register("firstName")}
            className="input-base w-full p-1 border-none outline-gray-100"
            placeholder="Enter first name"
            autoCapitalize="none"
            autoComplete="off"
          />
          {errors.firstName && (
            <p className="text-sm text-red-500 mt-1">{errors.firstName.message}</p>
          )}
        </div>
        <div>
          <Label>Last Name *</Label>
          <input
            {...register("lastName")}
            className="input-base w-full p-1 border-none outline-gray-100"
            placeholder="Enter last name"
            autoCapitalize="none"
            autoComplete="off"
          />
          {errors.lastName && (
            <p className="text-sm text-red-500 mt-1">{errors.lastName.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Display Name *</Label>
          <input
            {...register("name")}
            className="input-base w-full p-1 border-none outline-gray-100"
            placeholder="e.g., John Doe"
            autoCapitalize="none"
            autoComplete="off"
          />
          {errors.name && (
            <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
          )}
        </div>
        <div>
          <Label>Email *</Label>
          <input
            {...register("email")}
            type="email"
            className="input-base w-full p-1 border-none outline-gray-100"
            placeholder="employee@dotspeaks.com"
            autoCapitalize="none"
            autoComplete="off"
          />
          {errors.email && (
            <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Password *</Label>
          <input
            {...register("password")}
            type="password"
            className="input-base w-full p-1 border-none outline-gray-100"
            placeholder="••••••••"
            autoComplete="new-password"
          />
          {errors.password && (
            <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>
          )}
        </div>
        <div>
          <Label>Personal Email</Label>
          <input
            {...register("personalEmail")}
            className="input-base w-full p-1 border-none outline-gray-100"
            placeholder="john@gmail.com"
            autoCapitalize="none"
            autoComplete="off"
          />
          {errors.personalEmail && (
            <p className="text-sm text-red-500 mt-1">{errors.personalEmail.message}</p>
          )}
        </div>
      </div>

      {/* Phones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Phone *</Label>
          <input
            {...register("phone")}
            className="input-base w-full p-1 border-none outline-gray-100"
            placeholder="+91 98765 43210"
            autoCapitalize="none"
            autoComplete="off"
          />
          {errors.phone && (
            <p className="text-sm text-red-500 mt-1">{errors.phone.message}</p>
          )}
        </div>
        <div>
          <Label>Alternate Phone</Label>
          <input
            {...register("altPhone")}
            className="input-base w-full p-1 border-none outline-gray-100"
            placeholder="+91 90000 00000"
            autoCapitalize="none"
            autoComplete="off"
          />
          {errors.altPhone && (
            <p className="text-sm text-red-500 mt-1">{errors.altPhone.message}</p>
          )}
        </div>
      </div>

      {/* Emergency */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Emergency Contact Name</Label>
          <input
            {...register("emergencyContactName")}
            className="input-base w-full p-1 border-none outline-gray-100"
            placeholder="Guardian name"
            autoCapitalize="none"
            autoComplete="off"
          />
        </div>
        <div>
          <Label>Emergency Contact Phone</Label>
          <input
            {...register("emergencyContactPhone")}
            className="input-base w-full p-1 border-none outline-gray-100"
            placeholder="+91 9xxxx xxxxx"
            autoCapitalize="none"
            autoComplete="off"
          />
          {errors.emergencyContactPhone && (
            <p className="text-sm text-red-500 mt-1">{errors.emergencyContactPhone.message}</p>
          )}
        </div>
      </div>

      {/* Employment */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Designation *</Label>
          <input
            {...register("designation")}
            className="input-base w-full p-1 border-none outline-gray-100"
            placeholder="Software Engineer"
            autoCapitalize="none"
            autoComplete="off"
          />
          {errors.designation && (
            <p className="text-sm text-red-500 mt-1">{errors.designation.message}</p>
          )}
        </div>


        <div>
          <Label>Employee ID</Label>
          <input
            {...register("employeeId")}
            className="input-base w-full p-1 border-none outline-gray-100"
            placeholder="EMP-001"
            autoCapitalize="none"
            autoComplete="off"
          />
          {errors.employeeId && (
            <p className="text-sm text-red-500 mt-1">{errors.employeeId.message}</p>
          )}
        </div>
      </div>

      {/* Dates & Type */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Joining Date *</Label>
          <input
            {...register("joiningDate")}
            type="date"
            className="input-base w-full p-1 border-none outline-gray-100"
          />
          {errors.joiningDate && (
            <p className="text-sm text-red-500 mt-1">{errors.joiningDate.message}</p>
          )}
        </div>
        <div>
          <Label>Date of Birth *</Label>
          <input
            {...register("dateOfBirth")}
            type="date"
            className="input-base w-full p-1 border-none outline-gray-100"
          />
          {errors.dateOfBirth && (
            <p className="text-sm text-red-500 mt-1">{errors.dateOfBirth.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Employee Type *</Label>
          <Controller
            control={control}
            name="employeeType"
            render={({ field }) => (
              <Select value={field.value} onValueChange={(v) => field.onChange(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full-time">Full-time</SelectItem>
                  <SelectItem value="part-time">Part-time</SelectItem>
                  <SelectItem value="contractor">Contractor</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {errors.employeeType && (
            <p className="text-sm text-red-500 mt-1">{errors.employeeType.message}</p>
          )}
        </div>
        <div>
          <Label>Access Role *</Label>
          <Controller
            control={control}
            name="accessRole"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select system role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPERATOR">Operator</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="PROJECT_MANAGER">Project Manager</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>
    </div>
  );
}

/* -------------------- Step 2 -------------------- */

function DocumentsForm({
  docs,
  setDocs,
  onValidityChange,
}: {
  docs: DocsState;
  setDocs: React.Dispatch<React.SetStateAction<DocsState>>;
  onValidityChange: (v: boolean) => void;
}) {
  type DocsFormType = z.infer<typeof documentsSchema>;

  // React Hook Form with Zod
  const {
    setValue,
    formState: { errors, isValid },
  } = useForm<DocsFormType>({
    resolver: zodResolver(documentsSchema),
    // mode: "onChange",
    mode: "onTouched",
    defaultValues: {
      aadhar: docs.aadhar,
      pan: docs.pan,
      bank: docs.bank,
      education: docs.education,
    },
  });

  // Sync validation to parent
  useEffect(() => {
    onValidityChange(isValid);
  }, [isValid, onValidityChange]);

  // When docs change (add/remove), update RHF values
  useEffect(() => {
    setValue("aadhar", docs.aadhar as any, { shouldValidate: true });
    setValue("pan", docs.pan as any, { shouldValidate: true });
    setValue("bank", docs.bank as any, { shouldValidate: true });
    setValue("education", docs.education as any, { shouldValidate: true });
  }, [docs, setValue]);

  // Add files
  const onPick =
    (key: keyof DocsState) =>
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        const updated = [...(docs[key] || []), ...files];
        setDocs((s) => ({ ...s, [key]: updated }));
        setValue(key as any, updated as any, {
          shouldValidate: true,
          shouldDirty: true,
        });
      };

  // Remove one file
  const removeOne = (key: keyof DocsState, index: number) => () => {
    const updated = docs[key].filter((_, i) => i !== index);
    setDocs((s) => ({ ...s, [key]: updated }));
    setValue(key as any, updated as any, { shouldValidate: true });
  };

  // Reusable picker UI (your same old design)
  const renderPicker = (
    label: string,
    key: keyof DocsState,
    accept = ".pdf,.jpg,.jpeg,.png"
  ) => (
    <div className="border border-dashed border-border rounded-lg p-4 space-y-2">
      <Label className="font-medium">{label}</Label>

      {/* File Input */}
      <Input type="file" multiple accept={accept} onChange={onPick(key)} />

      {/* Error Message */}
      {errors[key] && (
        <p className="text-sm text-red-500 mt-1">
          {(errors as any)[key]?.message}
        </p>
      )}

      {/* Selected Files List */}
      {docs[key]?.length > 0 && (
        <div className="text-xs text-muted-foreground mt-1 space-y-1">
          {docs[key].map((f, idx) => (
            <div
              key={`${f.name}-${idx}`}
              className="flex items-center justify-between"
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
      )}
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
  onValidityChange,
}: {
  offer: OfferPayload;
  setOffer: React.Dispatch<React.SetStateAction<OfferPayload>>;
  onValidityChange: (v: boolean) => void;
}) {
  type OfferFormType = z.infer<typeof offerSchema>;

  const {
    register,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<OfferFormType>({
    resolver: zodResolver(offerSchema),
    mode: "onChange",
    defaultValues: {
      roleTitle: offer.roleTitle,
      annualCTC: String(offer.annualCTC),
      basic: String(offer.basic),
      hra: String(offer.hra),
      da: String(offer.da),
      specialAllowance: String(offer.specialAllowance),
      grossSalary: String(offer.grossSalary),
      pfDeduction: String(offer.pfDeduction),
      tax: String(offer.tax),
      netSalary: String(offer.netSalary),
    },
  });

  useEffect(() => {
    onValidityChange(isValid);
  }, [isValid, onValidityChange]);

  // Sync form values to parent
  useEffect(() => {
    const sub = watch((values) => {
      setOffer((s) => ({
        ...s,
        ...values,
      }));
    });
    return () => sub.unsubscribe();
  }, [watch, setOffer]);

  /** Ensure numbers only (removes arrows + enforces digits) */
  const numericProps = (field: keyof OfferFormType) => ({
    ...register(field),
    type: "text",
    inputMode: "numeric" as const,
    pattern: "[0-9]*",
    onChange: (e: any) => {
      const cleaned = e.target.value.replace(/\D/g, ""); // keep digits only
      setValue(field, cleaned, { shouldValidate: true });
    },
  });

  return (
    <div className="space-y-4">

      {/* Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Role Title *</Label>
          <input
            {...register("roleTitle")}
            className="input-base mt-1 w-full p-1 border-none outline-gray-100"
            placeholder="Senior Software Engineer"
          />
          {errors.roleTitle && (
            <p className="text-sm text-red-500 mt-1">{errors.roleTitle.message}</p>
          )}
        </div>

        <div>
          <Label>Annual CTC (₹) *</Label>
          <input
            {...numericProps("annualCTC")}
            className="input-base mt-1 w-full p-1 border-none outline-gray-100"
            placeholder="1200000"
          />
          {errors.annualCTC && (
            <p className="text-sm text-red-500 mt-1">{errors.annualCTC.message}</p>
          )}
        </div>
      </div>

      {/* Breakdown Header */}
      <div className="space-y-4 pt-4 border-t">
        <h3 className="text-lg font-medium">Monthly Salary Breakdown (₹)</h3>

        {/* Salary Breakdown Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Basic Salary *</Label>
            <input
              {...numericProps("basic")}
              className="input-base mt-1 w-full p-1 border-none outline-gray-100"
              placeholder="50000"
            />
            {errors.basic && (
              <p className="text-sm text-red-500 mt-1">{errors.basic.message}</p>
            )}
          </div>

          <div>
            <Label>HRA *</Label>
            <input
              {...numericProps("hra")}
              className="input-base mt-1 w-full p-1 border-none outline-gray-100"
              placeholder="20000"
            />
            {errors.hra && (
              <p className="text-sm text-red-500 mt-1">{errors.hra.message}</p>
            )}
          </div>

          <div>
            <Label>DA</Label>
            <input
              {...numericProps("da")}
              className="input-base mt-1 w-full p-1 border-none outline-gray-100"
              placeholder="0"
            />
          </div>

          <div>
            <Label>Special Allowance *</Label>
            <input
              {...numericProps("specialAllowance")}
              className="input-base mt-1 w-full p-1 border-none outline-gray-100"
              placeholder="10000"
            />
            {errors.specialAllowance && (
              <p className="text-sm text-red-500 mt-1">
                {errors.specialAllowance.message}
              </p>
            )}
          </div>
        </div>

        {/* Gross Salary */}
        <div>
          <Label>Gross Salary (Monthly) *</Label>
          <input
            {...numericProps("grossSalary")}
            className="input-base mt-1 w-full p-1 border-none outline-gray-100"
            placeholder="80000"
          />
          {errors.grossSalary && (
            <p className="text-sm text-red-500 mt-1">{errors.grossSalary.message}</p>
          )}
        </div>

        {/* Deduction Header */}
        <h4 className="text-md font-medium pt-2">Monthly Deductions (₹)</h4>

        {/* Deduction Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>PF Deduction *</Label>
            <input
              {...numericProps("pfDeduction")}
              className="input-base mt-1 w-full p-1 border-none outline-gray-100"
              placeholder="1800"
            />
            {errors.pfDeduction && (
              <p className="text-sm text-red-500 mt-1">
                {errors.pfDeduction.message}
              </p>
            )}
          </div>

          <div>
            <Label>Tax (TDS) *</Label>
            <input
              {...numericProps("tax")}
              className="input-base mt-1 w-full p-1 border-none outline-gray-100"
              placeholder="5000"
            />
            {errors.tax && (
              <p className="text-sm text-red-500 mt-1">{errors.tax.message}</p>
            )}
          </div>
        </div>

        {/* Net Salary */}
        <div>
          <Label>Net Salary (Monthly) *</Label>
          <input
            {...numericProps("netSalary")}
            className="input-base mt-1 w-full p-1 border-none outline-gray-100"
            placeholder="73200"
          />
          {errors.netSalary && (
            <p className="text-sm text-red-500 mt-1">{errors.netSalary.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------- Step 4 -------------------- */

// function AssetsForm({
//   assets,
//   setAssets,
//   onValidityChange,
// }: {
// assets: {
//   laptopBrand?: string;
//   laptopModel?: string;
//   serialNumber?: string;
//   esiNumber?: string;
//   pfNumber?: string;
//   insuranceNumber?: string;
//   companyEmail?: string;
//   idNumber?: string;
//   simNumber?: string;
// };
//   setAssets: React.Dispatch<
//     React.SetStateAction<{
//       laptopBrand: string;
//       laptopModel: string;
//       serialNumber: string;
//       esiNumber: string;
//       pfNumber: string;
//       insuranceNumber: string;
//       companyEmail: string;
//       idNumber: string;
//       simNumber: string;
//     }>
//   >;
//   onValidityChange: (v: boolean) => void;
// }) {
//   type AssetsFormType = z.infer<typeof assetsSchema>;
//   const emptyToUndefined = (v: any) => (v === "" ? undefined : v);

//   const { register, watch, formState: { errors, isValid } } = useForm<AssetsFormType>({
//     resolver: zodResolver(assetsSchema),
//     mode: "onChange",
//     defaultValues: {
//       laptopBrand: assets.laptopBrand,
//       laptopModel: assets.laptopModel,
//       serialNumber: assets.serialNumber,
//       esiNumber: assets.esiNumber,
//       pfNumber: assets.pfNumber,
//       insuranceNumber: assets.insuranceNumber,
//       companyEmail: assets.companyEmail,
//       idNumber: assets.idNumber,
//       simNumber: assets.simNumber,
//     },
//   });

//   useEffect(() => {
//     onValidityChange(isValid);
//   }, [isValid, onValidityChange]);

//   useEffect(() => {
//     const sub = watch((values) => {
//       setAssets((s) => ({
//         ...s,
//         laptopBrand: values.laptopBrand ?? "",
//         laptopModel: values.laptopModel ?? "",
//         serialNumber: values.serialNumber ?? "",
//         esiNumber: values.esiNumber ?? "",
//         pfNumber: values.pfNumber ?? "",
//         insuranceNumber: values.insuranceNumber ?? "",
//         companyEmail: values.companyEmail ?? "",
//         idNumber: values.idNumber ?? "",
//         simNumber: values.simNumber ?? "",
//       }));
//     });
//     return () => sub.unsubscribe();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [watch]);

//   const setField = (k: keyof typeof assets) => (e: any) =>
//     setAssets((s) => ({ ...s, [k]: e.target.value }));

//   return (
//     <div className="space-y-4">
//       <p className="text-sm text-muted-foreground">Assign company assets to the new employee</p>
//       <div className="space-y-4">
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//           <div>
//             <Label>Laptop Brand</Label>
//             <input {...register("laptopBrand", { setValueAs: emptyToUndefined })} className="input-base mt-1 w-full p-1 border-none outline-gray-100" placeholder="e.g., Dell" />
//           </div>
//           <div>
//             <Label>Laptop Model</Label>
//             <input {...register("laptopModel", { setValueAs: emptyToUndefined })} className="input-base mt-1 w-full p-1 border-none outline-gray-100" placeholder="e.g., XPS 15" />
//           </div>
//         </div>

//         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//           <div>
//             <Label>ESI Number</Label>
//             <input {...register("serialNumber", { setValueAs: emptyToUndefined })} className="input-base mt-1 w-full p-1 border-none outline-gray-100" />
//             {errors.esiNumber && <p className="text-sm text-red-500 mt-1">{errors.esiNumber.message}</p>}
//           </div>
//           <div>
//             <Label>PF Number</Label>
//             <input {...register("pfNumber", { setValueAs: emptyToUndefined })} className="input-base mt-1 w-full p-1 border-none outline-gray-100" />
//             {errors.pfNumber && <p className="text-sm text-red-500 mt-1">{errors.pfNumber.message}</p>}
//           </div>

//           <div>
//             <Label>Insurance Number</Label>
//             <input {...register("insuranceNumber", { setValueAs: emptyToUndefined })} className="input-base mt-1 w-full p-1 border-none outline-gray-100" />
//             {errors.insuranceNumber && <p className="text-sm text-red-500 mt-1">{errors.insuranceNumber.message}</p>}
//           </div>

//           <div>
//             <Label>Serial Number</Label>
//             <input {...register("serialNumber", { setValueAs: emptyToUndefined })} className="input-base mt-1 w-full p-1 border-none outline-gray-100" placeholder="e.g., ABC123XYZ" />
//           </div>

//           <div>
//             <Label>Company Email</Label>
//             <input {...register("companyEmail", { setValueAs: emptyToUndefined })} className="input-base mt-1 w-full p-1 border-none outline-gray-100" />
//             {errors.companyEmail && <p className="text-sm text-red-500 mt-1">{errors.companyEmail.message}</p>}
//           </div>

//           <div>
//             <Label>ID Number</Label>
//             <input {...register("idNumber", { setValueAs: emptyToUndefined })} className="input-base mt-1 w-full p-1 border-none outline-gray-100" />
//             {errors.idNumber && <p className="text-sm text-red-500 mt-1">{errors.idNumber.message}</p>}
//           </div>
//         </div>

//         <div>
//           <Label>SIM Card Number</Label>
//           <input {...register("simNumber", { setValueAs: emptyToUndefined })} className="input-base mt-1 w-full p-1 border-none outline-gray-100" placeholder="e.g., +91 98765 00000" />
//           {errors.simNumber && <p className="text-sm text-red-500 mt-1">{errors.simNumber.message}</p>}
//         </div>
//       </div>
//     </div>
//   );
// }

function AssetsForm({
  assets,
  setAssets,
  onValidityChange,
}: {
  assets: {
    laptopBrand?: string;
    laptopModel?: string;
    serialNumber?: string;
    esiNumber?: string;
    pfNumber?: string;
    insuranceNumber?: string;
    companyEmail?: string;
    idNumber?: string;
    simNumber?: string;
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
  onValidityChange: (v: boolean) => void;
}) {
  type AssetsFormType = z.infer<typeof assetsSchema>;

  // 🔑 Converts "" → undefined so Zod optional works correctly
  const emptyToUndefined = (v: any) => (v === "" ? undefined : v);

  const {
    register,
    watch,
    trigger,
    formState: { errors, isValid },
  } = useForm<AssetsFormType>({
    resolver: zodResolver(assetsSchema),
    mode: "onChange",
    defaultValues: {
      laptopBrand: assets.laptopBrand,
      laptopModel: assets.laptopModel,
      serialNumber: assets.serialNumber,
      esiNumber: assets.esiNumber,
      pfNumber: assets.pfNumber,
      insuranceNumber: assets.insuranceNumber,
      companyEmail: assets.companyEmail,
      idNumber: assets.idNumber,
      simNumber: assets.simNumber,
    },
  });

  useEffect(() => {
    trigger(); // 👈 force initial validation
  }, [trigger]);

  // Inform parent about form validity
  useEffect(() => {
    onValidityChange(isValid);
  }, [isValid, onValidityChange]);

  // Sync form → parent state
  useEffect(() => {
    const sub = watch((values) => {
      setAssets((s) => ({
        ...s,
        laptopBrand: values.laptopBrand ?? "",
        laptopModel: values.laptopModel ?? "",
        serialNumber: values.serialNumber ?? "",
        esiNumber: values.esiNumber ?? "",
        pfNumber: values.pfNumber ?? "",
        insuranceNumber: values.insuranceNumber ?? "",
        companyEmail: values.companyEmail ?? "",
        idNumber: values.idNumber ?? "",
        simNumber: values.simNumber ?? "",
      }));
    });

    return () => sub.unsubscribe();
  }, [watch, setAssets]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Assign company assets to the new employee
      </p>

      <div className="space-y-4">
        {/* Laptop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Laptop Brand</Label>
            <input
              {...register("laptopBrand", { setValueAs: emptyToUndefined })}
              className="input-base mt-1 w-full p-1 border-none outline-gray-100"
              placeholder="e.g., Dell"
            />
          </div>

          <div>
            <Label>Laptop Model</Label>
            <input
              {...register("laptopModel", { setValueAs: emptyToUndefined })}
              className="input-base mt-1 w-full p-1 border-none outline-gray-100"
              placeholder="e.g., XPS 15"
            />
          </div>
        </div>

        {/* Statutory + Serial */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>ESI Number</Label>
            <input
              {...register("esiNumber", { setValueAs: emptyToUndefined })}
              className="input-base mt-1 w-full p-1 border-none outline-gray-100"
            />
            {errors.esiNumber && (
              <p className="text-sm text-red-500 mt-1">
                {errors.esiNumber.message}
              </p>
            )}
          </div>

          <div>
            <Label>PF Number</Label>
            <input
              {...register("pfNumber", { setValueAs: emptyToUndefined })}
              className="input-base mt-1 w-full p-1 border-none outline-gray-100"
            />
            {errors.pfNumber && (
              <p className="text-sm text-red-500 mt-1">
                {errors.pfNumber.message}
              </p>
            )}
          </div>

          <div>
            <Label>Insurance Number</Label>
            <input
              {...register("insuranceNumber", { setValueAs: emptyToUndefined })}
              className="input-base mt-1 w-full p-1 border-none outline-gray-100"
            />
            {errors.insuranceNumber && (
              <p className="text-sm text-red-500 mt-1">
                {errors.insuranceNumber.message}
              </p>
            )}
          </div>

          <div>
            <Label>Serial Number</Label>
            <input
              {...register("serialNumber", { setValueAs: emptyToUndefined })}
              className="input-base mt-1 w-full p-1 border-none outline-gray-100"
              placeholder="e.g., ABC123XYZ"
            />
          </div>

          <div>
            <Label>Company Email</Label>
            <input
              {...register("companyEmail", { setValueAs: emptyToUndefined })}
              className="input-base mt-1 w-full p-1 border-none outline-gray-100"
            />
            {errors.companyEmail && (
              <p className="text-sm text-red-500 mt-1">
                {errors.companyEmail.message}
              </p>
            )}
          </div>

          <div>
            <Label>ID Number</Label>
            <input
              {...register("idNumber", { setValueAs: emptyToUndefined })}
              className="input-base mt-1 w-full p-1 border-none outline-gray-100"
            />
            {errors.idNumber && (
              <p className="text-sm text-red-500 mt-1">
                {errors.idNumber.message}
              </p>
            )}
          </div>
        </div>

        {/* SIM */}
        <div>
          <Label>SIM Card Number</Label>
          <input
            {...register("simNumber", { setValueAs: emptyToUndefined })}
            className="input-base mt-1 w-full p-1 border-none outline-gray-100"
            placeholder="e.g., +91 98765 00000"
          />
          {errors.simNumber && (
            <p className="text-sm text-red-500 mt-1">
              {errors.simNumber.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}


/* -------------------- Step 5 -------------------- */
function OrientationForm({ onValidityChange }: { onValidityChange: (v: boolean) => void }) {
  // For orientation we require all checkboxes to be checked before continuing
  const checklistItems = [
    "Complete IT security training",
    "Review company policies",
    "Setup email and accounts",
    "Meet team members",
    "Software Account Creation",
    "Tour office facilities",
  ];

  const [checked, setChecked] = useState<boolean[]>(
    Array(checklistItems.length).fill(false)
  );

  useEffect(() => {
    const all = checked.every(Boolean);
    onValidityChange(all);
  }, [checked, onValidityChange]);

  const toggle = (i: number) => () => {
    setChecked((s) => {
      const copy = [...s];
      copy[i] = !copy[i];
      return copy;
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Track completion of orientation activities</p>
      <div className="space-y-3">
        {checklistItems.map((item, index) => (
          <label
            key={index}
            className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-secondary cursor-pointer transition-colors"
          >
            <input type="checkbox" checked={checked[index]} onChange={toggle(index)} className="w-4 h-4" />
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
      <p className="text-muted-foreground">The employee has been successfully added to the system.</p>
    </div>
  );
}

