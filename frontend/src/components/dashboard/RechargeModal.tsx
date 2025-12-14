'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Coins, Zap, Star, ShieldCheck } from 'lucide-react';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

interface RechargeModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function RechargeModal({ open, onOpenChange }: RechargeModalProps) {
    const { currentWorkspace } = useWorkspaceStore();
    
    const packs = [
        { id: 'starter', credits: 100, price: '$2.99', popular: false, icon: Coins },
        { id: 'creator', credits: 500, price: '$9.99', popular: true, icon: Zap },
        { id: 'pro', credits: 1200, price: '$19.99', popular: false, icon: Star },
    ];

    const handlePurchase = (packId: string) => {
        // Mock purchase
        alert(`Purchased pack ${packId} (Simulation). In real app, this redirects to Stripe.`);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] bg-[#0F0F12] border-gray-800 text-white">
                <DialogHeader>
                    <DialogTitle className="text-xl flex items-center gap-2">
                        <Coins className="text-yellow-500" />
                        Recharge Credits
                    </DialogTitle>
                    <DialogDescription className="text-gray-400">
                        You currently have <span className="text-yellow-500 font-bold">{currentWorkspace?.credits || 0}</span> credits.
                        Top up to continue creating.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
                    {packs.map((pack) => (
                        <div 
                            key={pack.id} 
                            className={`
                                relative flex flex-col items-center p-4 rounded-xl border bg-[#15151A] hover:bg-[#1A1A20] transition-colors cursor-pointer group
                                ${pack.popular ? 'border-purple-500/50 shadow-lg shadow-purple-900/20' : 'border-gray-800'}
                            `}
                            onClick={() => handlePurchase(pack.id)}
                        >
                            {pack.popular && (
                                <div className="absolute -top-3 bg-purple-600 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                                    Best Value
                                </div>
                            )}
                            <div className="p-3 rounded-full bg-gray-800 mb-3 group-hover:scale-110 transition-transform">
                                <pack.icon size={24} className="text-yellow-500" />
                            </div>
                            <div className="text-2xl font-bold text-white mb-1">{pack.credits}</div>
                            <div className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-4">Credits</div>
                            <Button 
                                className={`w-full ${pack.popular ? 'bg-purple-600 hover:bg-purple-500' : 'bg-gray-800 hover:bg-gray-700'}`}
                            >
                                {pack.price}
                            </Button>
                        </div>
                    ))}
                </div>

                <div className="bg-gray-800/30 rounded-lg p-4 flex items-start gap-3">
                    <ShieldCheck className="text-green-500 shrink-0 mt-0.5" size={18} />
                    <div className="text-sm text-gray-400">
                        <p className="text-gray-200 font-medium mb-1">Secure Payment</p>
                        Payments are processed securely via Stripe. Credits never expire as long as your account is active.
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
