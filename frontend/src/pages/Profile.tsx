import { useEffect, useMemo, useState } from "react";
import axios from "axios";

import { AppLayout } from "@/components/layout/AppLayout";
import { useToast } from "@/hooks/use-toast";
import {
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Shield,
  FileText,
  Edit,
  Droplets,
  AlertCircle,
  Pill,
  Heart,
  Save,
  X,
  Loader2,
} from "lucide-react";

interface EmergencyContact {
  name: string;
  relation: string;
  phone: string;
}

interface PatientProfile {
  _id?: string;
  email: string;
  name: string;
  phone: string;
  date_of_birth: string;
  location: string;
  blood_type?: string;
  allergies: string[];
  medications: string[];
  conditions: string[];
  emergency_contact: EmergencyContact;
}

const API_BASE = import.meta.env.VITE_RESCUE_API_URL || "http://localhost:8000";

const fallbackProfile: PatientProfile = {
  email: "john.doe@email.com",
  name: "John Doe",
  phone: "+1 (555) 123-4567",
  date_of_birth: "1988-03-15",
  location: "San Francisco, CA",
  blood_type: "A+",
  allergies: ["Penicillin", "Peanuts"],
  medications: ["Lisinopril 10mg", "Vitamin D 1000 IU"],
  conditions: ["Hypertension (controlled)"],
  emergency_contact: {
    name: "Jane Doe",
    relation: "Spouse",
    phone: "+1 (555) 987-6543",
  },
};

const splitList = (value: string) =>
  value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);

const listText = (items?: string[]) => (items || []).join("\n");

const normalizeProfile = (profile: Partial<PatientProfile> | null | undefined): PatientProfile => ({
  ...fallbackProfile,
  ...(profile || {}),
  allergies: profile?.allergies || fallbackProfile.allergies,
  medications: profile?.medications || fallbackProfile.medications,
  conditions: profile?.conditions || fallbackProfile.conditions,
  emergency_contact: {
    ...fallbackProfile.emergency_contact,
    ...(profile?.emergency_contact || {}),
  },
});

export default function Profile() {
  const { toast } = useToast();
  const [apiUser, setApiUser] = useState<PatientProfile>(fallbackProfile);
  const [form, setForm] = useState<PatientProfile>(fallbackProfile);
  const [allergiesText, setAllergiesText] = useState(listText(fallbackProfile.allergies));
  const [medicationsText, setMedicationsText] = useState(listText(fallbackProfile.medications));
  const [conditionsText, setConditionsText] = useState(listText(fallbackProfile.conditions));
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const profileEmail = useMemo(
    () => localStorage.getItem("user_email") || apiUser.email || fallbackProfile.email,
    [apiUser.email]
  );

  const syncForm = (profile: PatientProfile) => {
    setForm(profile);
    setAllergiesText(listText(profile.allergies));
    setMedicationsText(listText(profile.medications));
    setConditionsText(listText(profile.conditions));
  };

  useEffect(() => {
    const email = localStorage.getItem("user_email") || fallbackProfile.email;

    axios
      .get(`${API_BASE}/users/profile`, { params: { email } })
      .then((res) => {
        const profile = normalizeProfile(res.data);
        setApiUser(profile);
        syncForm(profile);
      })
      .catch(() => {
        setApiUser(fallbackProfile);
        syncForm(fallbackProfile);
      })
      .finally(() => setLoading(false));
  }, []);

  const updateForm = (field: keyof PatientProfile, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateEmergencyContact = (field: keyof EmergencyContact, value: string) => {
    setForm((prev) => ({
      ...prev,
      emergency_contact: {
        ...prev.emergency_contact,
        [field]: value,
      },
    }));
  };

  const cancelEdit = () => {
    syncForm(apiUser);
    setEditing(false);
  };

  const saveProfile = async () => {
    const payload: PatientProfile = {
      ...form,
      email: form.email.trim().toLowerCase(),
      name: form.name.trim(),
      phone: form.phone.trim(),
      date_of_birth: form.date_of_birth.trim(),
      location: form.location.trim(),
      blood_type: form.blood_type?.trim() || "",
      allergies: splitList(allergiesText),
      medications: splitList(medicationsText),
      conditions: splitList(conditionsText),
      emergency_contact: {
        name: form.emergency_contact.name.trim(),
        relation: form.emergency_contact.relation.trim(),
        phone: form.emergency_contact.phone.trim(),
      },
    };

    setSaving(true);
    try {
      const res = await axios.put(`${API_BASE}/users/profile`, payload, {
        params: { email: profileEmail },
      });
      const updated = normalizeProfile(res.data);
      setApiUser(updated);
      syncForm(updated);
      localStorage.setItem("user_email", updated.email);
      setEditing(false);
      toast({ title: "Profile updated", description: "Patient details saved successfully." });
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error?.response?.data?.detail || error?.message || "Unable to update profile.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const displayUser = editing ? form : apiUser;

  return (
    <AppLayout>
      <div className="flex flex-col gap-4 mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center">
            <User className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
            <p className="text-muted-foreground">Manage patient details and emergency medical records</p>
          </div>
        </div>

        {editing ? (
          <div className="flex flex-wrap gap-2">
            <button className="btn-medical" onClick={saveProfile} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Profile
            </button>
            <button className="px-4 py-2 rounded-xl border border-border text-muted-foreground hover:text-foreground" onClick={cancelEdit} disabled={saving}>
              <X className="w-4 h-4 inline mr-2" />
              Cancel
            </button>
          </div>
        ) : (
          <button className="btn-medical" onClick={() => setEditing(true)} disabled={loading}>
            <Edit className="w-4 h-4" />
            Edit Profile
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card-medical">
          <div className="text-center mb-6">
            <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
              <User className="w-12 h-12 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold text-foreground">{displayUser.name}</h2>
            <p className="text-muted-foreground">Patient ID: {displayUser._id || "AED-2026-00127"}</p>
          </div>

          <div className="space-y-4">
            {editing ? (
              <>
                <input className="input-medical" value={form.name} onChange={(e) => updateForm("name", e.target.value)} placeholder="Full name" />
                <input className="input-medical" type="email" value={form.email} onChange={(e) => updateForm("email", e.target.value)} placeholder="Email" />
                <input className="input-medical" value={form.phone} onChange={(e) => updateForm("phone", e.target.value)} placeholder="Phone" />
                <input className="input-medical" type="date" value={form.date_of_birth} onChange={(e) => updateForm("date_of_birth", e.target.value)} />
                <input className="input-medical" value={form.location} onChange={(e) => updateForm("location", e.target.value)} placeholder="Location" />
              </>
            ) : (
              <>
                <div className="flex items-center gap-3"><Mail className="w-5 h-5 text-muted-foreground" /><span>{displayUser.email}</span></div>
                <div className="flex items-center gap-3"><Phone className="w-5 h-5 text-muted-foreground" /><span>{displayUser.phone}</span></div>
                <div className="flex items-center gap-3"><Calendar className="w-5 h-5 text-muted-foreground" /><span>{displayUser.date_of_birth}</span></div>
                <div className="flex items-center gap-3"><MapPin className="w-5 h-5 text-muted-foreground" /><span>{displayUser.location}</span></div>
              </>
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-border">
            <div className="flex items-center gap-2 text-accent">
              <Shield className="w-5 h-5" />
              <span className="text-sm font-medium">Records encrypted & secure</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card-medical text-center">
              <div className="w-10 h-10 rounded-lg bg-emergency-red/20 flex items-center justify-center mx-auto mb-2">
                <Droplets className="w-5 h-5 text-emergency-red" />
              </div>
              <p className="text-xs text-muted-foreground">Blood Type</p>
              {editing ? (
                <input className="input-medical mt-2 text-center" value={form.blood_type || ""} onChange={(e) => updateForm("blood_type", e.target.value)} placeholder="A+" />
              ) : (
                <p className="text-xl font-bold text-foreground">{displayUser.blood_type || "Not set"}</p>
              )}
            </div>

            <div className="card-medical text-center">
              <div className="w-10 h-10 rounded-lg bg-warning-amber/20 flex items-center justify-center mx-auto mb-2">
                <AlertCircle className="w-5 h-5 text-warning-amber" />
              </div>
              <p className="text-xs text-muted-foreground">Allergies</p>
              <p className="text-xl font-bold text-foreground">{(editing ? splitList(allergiesText) : displayUser.allergies).length}</p>
            </div>

            <div className="card-medical text-center">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center mx-auto mb-2">
                <Pill className="w-5 h-5 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground">Medications</p>
              <p className="text-xl font-bold text-foreground">{(editing ? splitList(medicationsText) : displayUser.medications).length}</p>
            </div>

            <div className="card-medical text-center">
              <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center mx-auto mb-2">
                <Heart className="w-5 h-5 text-accent" />
              </div>
              <p className="text-xs text-muted-foreground">Conditions</p>
              <p className="text-xl font-bold text-foreground">{(editing ? splitList(conditionsText) : displayUser.conditions).length}</p>
            </div>
          </div>

          <div className="card-medical">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Medical Records
            </h3>

            {editing ? (
              <div className="grid gap-4">
                <label className="text-sm font-medium text-muted-foreground">
                  Known Allergies
                  <textarea className="input-medical mt-2 min-h-24" value={allergiesText} onChange={(e) => setAllergiesText(e.target.value)} placeholder="One allergy per line or comma separated" />
                </label>
                <label className="text-sm font-medium text-muted-foreground">
                  Current Medications
                  <textarea className="input-medical mt-2 min-h-24" value={medicationsText} onChange={(e) => setMedicationsText(e.target.value)} placeholder="One medication per line or comma separated" />
                </label>
                <label className="text-sm font-medium text-muted-foreground">
                  Medical Conditions
                  <textarea className="input-medical mt-2 min-h-24" value={conditionsText} onChange={(e) => setConditionsText(e.target.value)} placeholder="One condition per line or comma separated" />
                </label>
              </div>
            ) : (
              <div className="space-y-4">
                {[
                  { label: "Known Allergies", values: displayUser.allergies, className: "bg-warning-amber/20 text-warning-amber" },
                  { label: "Current Medications", values: displayUser.medications, className: "bg-primary/20 text-primary" },
                  { label: "Medical Conditions", values: displayUser.conditions, className: "bg-secondary text-foreground" },
                ].map((section) => (
                  <div key={section.label}>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">{section.label}</h4>
                    <div className="flex flex-wrap gap-2">
                      {section.values.length ? (
                        section.values.map((item) => (
                          <span key={item} className={`px-3 py-1 rounded-full text-sm ${section.className}`}>
                            {item}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">None listed</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card-emergency">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-emergency-red" />
              Emergency Contact
            </h3>
            {editing ? (
              <div className="grid gap-3 md:grid-cols-3">
                <input className="input-medical" value={form.emergency_contact.name} onChange={(e) => updateEmergencyContact("name", e.target.value)} placeholder="Contact name" />
                <input className="input-medical" value={form.emergency_contact.relation} onChange={(e) => updateEmergencyContact("relation", e.target.value)} placeholder="Relation" />
                <input className="input-medical" value={form.emergency_contact.phone} onChange={(e) => updateEmergencyContact("phone", e.target.value)} placeholder="Phone" />
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">{displayUser.emergency_contact.name}</p>
                  <p className="text-sm text-muted-foreground">{displayUser.emergency_contact.relation}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-foreground">{displayUser.emergency_contact.phone}</p>
                  <a className="text-sm text-primary hover:underline" href={`tel:${displayUser.emergency_contact.phone}`}>
                    Call Now
                  </a>
                </div>
              </div>
            )}
          </div>

          <div className="card-medical">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-accent" />
              Privacy & Security
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                <span className="text-foreground">Two-Factor Authentication</span>
                <span className="px-2 py-1 rounded-full bg-accent/20 text-accent text-xs">Enabled</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                <span className="text-foreground">Data Encryption</span>
                <span className="px-2 py-1 rounded-full bg-accent/20 text-accent text-xs">AES-256</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                <span className="text-foreground">Last Login</span>
                <span className="text-muted-foreground text-sm">Today, 2:30 PM</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
