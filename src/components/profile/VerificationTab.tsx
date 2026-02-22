import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, CheckCircle, AlertCircle, Clock, Camera, FileText, 
  Loader2, Upload, XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface VerificationTabProps {
  verificationStatus: string;
  accountType: string | null;
  profile: any;
  onVerificationSubmitted: () => void;
}

export const VerificationTab = ({ 
  verificationStatus, 
  accountType, 
  profile, 
  onVerificationSubmitted 
}: VerificationTabProps) => {
  const { user } = useAuth();
  const { updateProfile } = useProfile();
  const { toast } = useToast();
  const facePhotoRef = useRef<HTMLInputElement>(null);
  const cacDocRef = useRef<HTMLInputElement>(null);

  const [nationalIdNumber, setNationalIdNumber] = useState(profile?.national_id_number || '');
  const [facePhotoUrl, setFacePhotoUrl] = useState(profile?.face_verification_url || '');
  const [cacNumber, setCacNumber] = useState(profile?.cac_number || '');
  const [cacDocumentUrl, setCacDocumentUrl] = useState(profile?.cac_document_url || '');
  const [uploadingFace, setUploadingFace] = useState(false);
  const [uploadingCAC, setUploadingCAC] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isCompany = accountType === 'company';

  const handleUploadFacePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingFace(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/face-verification.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('user-media').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('user-media').getPublicUrl(filePath);
      setFacePhotoUrl(publicUrl);
      toast({ title: 'Success', description: 'Face photo uploaded!' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setUploadingFace(false);
    }
  };

  const handleUploadCACDoc = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingCAC(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/cac-document.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('user-media').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('user-media').getPublicUrl(filePath);
      setCacDocumentUrl(publicUrl);
      toast({ title: 'Success', description: 'CAC document uploaded!' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setUploadingCAC(false);
    }
  };

  const handleSubmitVerification = async () => {
    setSubmitting(true);
    try {
      const updateData: any = { verification_status: 'pending' };
      
      if (isCompany) {
        if (!cacNumber || !cacDocumentUrl) {
          toast({ title: 'Missing information', description: 'Please provide your CAC number and upload your CAC document.', variant: 'destructive' });
          setSubmitting(false);
          return;
        }
        updateData.cac_number = cacNumber;
        updateData.cac_document_url = cacDocumentUrl;
      } else {
        if (!nationalIdNumber || !facePhotoUrl) {
          toast({ title: 'Missing information', description: 'Please provide your NIN and upload a face photo.', variant: 'destructive' });
          setSubmitting(false);
          return;
        }
        updateData.national_id_number = nationalIdNumber;
        updateData.face_verification_url = facePhotoUrl;
      }

      const { error } = await updateProfile(updateData);
      if (error) throw error;

      toast({ title: 'Verification submitted!', description: 'Your documents are now under review.' });
      onVerificationSubmitted();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // ===== VERIFIED =====
  if (verificationStatus === 'verified') {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <Card className="p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">You're Verified!</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Your identity has been verified. You now have full access to all platform features.
          </p>
          <Badge variant="success" className="text-sm px-4 py-1.5">
            <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
            Verified Account
          </Badge>
        </Card>
      </motion.div>
    );
  }

  // ===== PENDING =====
  if (verificationStatus === 'pending') {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <Card className="p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-warning" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">Under Review</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Your verification documents have been submitted and are currently being reviewed by our team. This typically takes 24–48 hours.
          </p>
          <Badge variant="warning" className="text-sm px-4 py-1.5">
            <Clock className="w-3.5 h-3.5 mr-1.5" />
            Pending Review
          </Badge>
        </Card>
        <Card className="p-4 bg-muted/50">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <h4 className="font-medium text-foreground text-sm">What happens next?</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Our verification team will review your documents. You'll receive a notification once the review is complete.
              </p>
            </div>
          </div>
        </Card>
      </motion.div>
    );
  }

  // ===== UNVERIFIED (Not Submitted) — show form =====
  // This covers both 'unverified' status and any unknown/rejected status needing re-submission
  const isRejected = verificationStatus === 'rejected';

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {isRejected && (
        <Card className="p-4 border-destructive/30 bg-destructive/5">
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-destructive mt-0.5" />
            <div>
              <h4 className="font-medium text-foreground text-sm">Verification Rejected</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Your previous verification submission was not approved. Please review your documents and re-submit.
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">
              {isRejected ? 'Re-submit Verification' : 'Identity Verification'}
            </h3>
            <p className="text-xs text-muted-foreground">
              {isCompany ? 'Upload your CAC documents to get verified' : 'Verify your identity using your NIN'}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {isCompany ? (
            <>
              {/* CAC Document Upload */}
              <Card className="p-4">
                <div className="flex items-center gap-4">
                  <div className={`w-20 h-20 rounded-2xl flex items-center justify-center border-2 border-dashed ${
                    cacDocumentUrl ? 'border-success bg-success/10' : 'border-border bg-muted'
                  }`}>
                    {uploadingCAC ? (
                      <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                    ) : cacDocumentUrl ? (
                      <CheckCircle className="w-8 h-8 text-success" />
                    ) : (
                      <FileText className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground flex items-center gap-2 text-sm">
                      CAC Certificate {cacDocumentUrl && <CheckCircle className="w-4 h-4 text-success" />}
                    </h4>
                    <p className="text-xs text-muted-foreground">Upload your CAC document</p>
                    <input ref={cacDocRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleUploadCACDoc} />
                    <Button variant="outline" size="sm" className="mt-2"
                      onClick={() => cacDocRef.current?.click()} disabled={uploadingCAC}>
                      {uploadingCAC ? 'Uploading...' : cacDocumentUrl ? 'Change Document' : 'Upload Document'}
                    </Button>
                  </div>
                </div>
              </Card>

              {/* CAC Number */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">CAC Registration Number</label>
                <Input 
                  placeholder="e.g., RC1234567" 
                  value={cacNumber}
                  onChange={(e) => setCacNumber(e.target.value)} 
                  className="h-12" 
                />
              </div>
            </>
          ) : (
            <>
              {/* Face Photo Upload */}
              <Card className="p-4">
                <div className="flex items-center gap-4">
                  <div className={`w-20 h-20 rounded-2xl flex items-center justify-center border-2 border-dashed overflow-hidden ${
                    facePhotoUrl ? 'border-success bg-success/10' : 'border-border bg-muted'
                  }`}>
                    {facePhotoUrl ? (
                      <img src={facePhotoUrl} alt="Face" className="w-full h-full object-cover" />
                    ) : uploadingFace ? (
                      <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                    ) : (
                      <Camera className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground flex items-center gap-2 text-sm">
                      Face Photo {facePhotoUrl && <CheckCircle className="w-4 h-4 text-success" />}
                    </h4>
                    <p className="text-xs text-muted-foreground">Take a clear selfie</p>
                    <input ref={facePhotoRef} type="file" accept="image/*" capture="user" className="hidden" onChange={handleUploadFacePhoto} />
                    <Button variant="outline" size="sm" className="mt-2"
                      onClick={() => facePhotoRef.current?.click()} disabled={uploadingFace}>
                      {uploadingFace ? 'Uploading...' : facePhotoUrl ? 'Change Photo' : 'Upload Photo'}
                    </Button>
                  </div>
                </div>
              </Card>

              {/* NIN */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">National ID Number (NIN)</label>
                <Input 
                  placeholder="Enter your NIN" 
                  value={nationalIdNumber}
                  onChange={(e) => setNationalIdNumber(e.target.value)} 
                  className="h-12" 
                />
                <p className="text-xs text-muted-foreground">Your ID is securely stored and only used for verification</p>
              </div>
            </>
          )}
        </div>
      </Card>

      <Card className="p-4 bg-muted/50">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-primary mt-0.5" />
          <div>
            <h4 className="font-medium text-foreground text-sm">Secure Document Storage</h4>
            <p className="text-xs text-muted-foreground mt-1">Your documents are encrypted and only accessible to our verification team.</p>
          </div>
        </div>
      </Card>

      <Button 
        className="w-full h-12" 
        onClick={handleSubmitVerification} 
        disabled={submitting}
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Submitting...
          </>
        ) : (
          <>
            <Upload className="w-4 h-4 mr-2" />
            {isRejected ? 'Re-submit for Verification' : 'Submit for Verification'}
          </>
        )}
      </Button>
    </motion.div>
  );
};
