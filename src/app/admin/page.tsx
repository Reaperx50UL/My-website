import { ShieldAlert, Database, Lock } from "lucide-react";

export default function AdminPlaceholder() {
  return (
    <div className="py-24 max-w-4xl mx-auto text-center">
      <div className="inline-flex items-center justify-center p-4 bg-secondary rounded-full mb-8">
        <Lock className="w-12 h-12 text-muted-foreground" />
      </div>
      
      <h1 className="text-4xl font-bold tracking-tight mb-4">Admin Dashboard</h1>
      <p className="text-xl text-muted-foreground mb-12">
        Restricted Area. Authentication system and database integration pending.
      </p>
      
      <div className="grid md:grid-cols-3 gap-6 text-left">
        <div className="glass-panel p-6 rounded-xl border border-white/5 opacity-70">
          <Database className="w-8 h-8 text-primary mb-4" />
          <h3 className="font-bold mb-2">Future Database</h3>
          <p className="text-sm text-muted-foreground">Will connect to PostgreSQL to manage projects, web lab instances, and analytics.</p>
        </div>
        
        <div className="glass-panel p-6 rounded-xl border border-white/5 opacity-70">
          <ShieldAlert className="w-8 h-8 text-primary mb-4" />
          <h3 className="font-bold mb-2">Authentication</h3>
          <p className="text-sm text-muted-foreground">Will implement secure login via NextAuth or similar provider.</p>
        </div>
        
        <div className="glass-panel p-6 rounded-xl border border-white/5 opacity-70">
          <Lock className="w-8 h-8 text-primary mb-4" />
          <h3 className="font-bold mb-2">Content Management</h3>
          <p className="text-sm text-muted-foreground">Will allow dynamic updating of resume, skills, experience, and contact messages.</p>
        </div>
      </div>
    </div>
  );
}
