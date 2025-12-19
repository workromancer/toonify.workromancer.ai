'use client';

// Removed unused alert-dialog imports
import { Button } from "@/components/ui/button"
import { ReactNode } from "react";

// Wait, I need to check if alert-dialog exists first. 
// If not, I should implement a simple one using Dialog or just raw div if Dialog is missing too.
// I saw dialog.tsx in components/ui earlier.

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";

interface ConfirmationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel?: () => void;
    variant?: 'default' | 'destructive';
    trigger?: ReactNode;
    icon?: ReactNode;
}

export function ConfirmationDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    onConfirm,
    onCancel,
    variant = 'default',
    trigger,
    icon
}: ConfirmationDialogProps) {
    const isDestructive = variant === 'destructive';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="bg-[#0f0f16] border-slate-800 text-white sm:max-w-[400px] rounded-2xl p-6 overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-slate-700 to-transparent opacity-20" />

                <div className="flex flex-col items-center text-center gap-4 py-2">
                    {icon || (isDestructive ? (
                        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-2 ring-4 ring-red-500/5">
                            <AlertTriangle size={24} />
                        </div>
                    ) : (
                        <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 mb-2 ring-4 ring-blue-500/5">
                            <AlertTriangle size={24} />
                        </div>
                    ))}

                    <DialogHeader className="space-y-2">
                        <DialogTitle className="text-xl font-bold tracking-tight text-white">{title}</DialogTitle>
                        <DialogDescription className="text-slate-400 text-sm leading-relaxed">
                            {description}
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <DialogFooter className="mt-6 flex flex-row gap-3 sm:justify-center">
                    <Button
                        variant="ghost"
                        onClick={() => {
                            if (onCancel) onCancel();
                            onOpenChange(false);
                        }}
                        className="flex-1 bg-slate-800/50 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition-all rounded-xl"
                    >
                        {cancelLabel}
                    </Button>
                    <Button
                        variant={isDestructive ? 'destructive' : 'default'}
                        onClick={() => {
                            onConfirm();
                            onOpenChange(false);
                        }}
                        className={`flex-1 font-bold rounded-xl shadow-lg transition-all ${isDestructive ? 'bg-red-600 hover:bg-red-500 shadow-red-900/20' : 'bg-primary hover:bg-primary/90 shadow-primary/20'
                            }`}
                    >
                        {confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
