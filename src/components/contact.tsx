"use client";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Send, MapPin, Mail } from "lucide-react";
import { portfolioData } from "@/data/portfolio";

const contactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  subject: z.string().min(5, "Subject must be at least 5 characters"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type ContactFormValues = z.infer<typeof contactSchema>;

export function ContactSection() {
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema)
  });

  const onSubmit = async (data: ContactFormValues) => {
    // In a real app, send to API endpoint
    console.log("Form submitted:", data);
    await new Promise(resolve => setTimeout(resolve, 1000));
    reset();
    alert("Message ready to be connected to a backend!");
  };

  return (
    <section id="contact" className="py-24 relative scroll-mt-20">
      <div className="mb-12 text-center md:text-left">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">Initialize Contact</h2>
        <div className="w-20 h-1 bg-primary rounded-full mx-auto md:mx-0"></div>
        <p className="text-muted-foreground mt-4 max-w-2xl mx-auto md:mx-0">
          Interested in collaborating or have a question? Send me a message and I&apos;ll get back to you as soon as possible.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-12">
        <div className="lg:col-span-1 space-y-8">
          <div className="glass-panel p-6 rounded-lg flex items-start gap-4 hover:border-primary/30 transition-colors group">
            <div className="p-3 bg-primary/10 text-primary rounded-md group-hover:scale-110 transition-transform">
              <Mail size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-1">Email</h3>
              <a href={`mailto:${portfolioData.personalInfo.email}`} className="text-muted-foreground hover:text-primary transition-colors text-sm">
                {portfolioData.personalInfo.email}
              </a>
            </div>
          </div>
          
          <div className="glass-panel p-6 rounded-lg flex items-start gap-4 hover:border-primary/30 transition-colors group">
            <div className="p-3 bg-primary/10 text-primary rounded-md group-hover:scale-110 transition-transform">
              <MapPin size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-1">Location</h3>
              <p className="text-muted-foreground text-sm">
                {portfolioData.personalInfo.location}
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit(onSubmit)} className="glass-panel p-8 rounded-lg space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-foreground">Name</label>
                <input
                  id="name"
                  {...register("name")}
                  className="w-full bg-background/50 border border-input rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring transition-all"
                  placeholder="John Doe"
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-foreground">Email</label>
                <input
                  id="email"
                  type="email"
                  {...register("email")}
                  className="w-full bg-background/50 border border-input rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring transition-all"
                  placeholder="john@example.com"
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="subject" className="text-sm font-medium text-foreground">Subject</label>
              <input
                id="subject"
                {...register("subject")}
                className="w-full bg-background/50 border border-input rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring transition-all"
                placeholder="Project Inquiry"
              />
              {errors.subject && <p className="text-xs text-destructive">{errors.subject.message}</p>}
            </div>

            <div className="space-y-2">
              <label htmlFor="message" className="text-sm font-medium text-foreground">Message</label>
              <textarea
                id="message"
                {...register("message")}
                rows={5}
                className="w-full bg-background/50 border border-input rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring transition-all resize-none"
                placeholder="How can we work together?"
              />
              {errors.message && <p className="text-xs text-destructive">{errors.message.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-8 py-3 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 hover:glow-primary-hover transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Sending..." : "Send Message"}
              {!isSubmitting && <Send size={18} />}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
