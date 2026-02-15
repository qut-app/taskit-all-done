import { Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface UpgradeRequiredDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const UpgradeRequiredDialog = ({ open, onOpenChange }: UpgradeRequiredDialogProps) => {
  const navigate = useNavigate();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-warning" />
            <AlertDialogTitle>Upgrade Required</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            To post jobs, create content, or boost posts, please subscribe to a Company plan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => navigate('/company/upgrade')}>
            View Plans
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default UpgradeRequiredDialog;
