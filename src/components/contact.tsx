"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Send, Mail, Server, Phone } from "lucide-react";
import { profileData } from "@/data/profile";
import { motion } from "framer-motion";

const contactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  subject: z.string().min(5, "Subject must be at least 5 characters"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type ContactFormValues = z.infer<typeof contactSchema>;

export function ContactSection() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = async (data: ContactFormValues) => {
    // Frontend UI only - ready for backend integration
    console.log("Form submitted locally:", data);
    await new Promise((resolve) => setTimeout(resolve, 800));
    reset();
    alert("This is a frontend UI demo. Backend integration required to actually send emails.");
  };

  return (
    <section id="contact" className="py-16 sm:py-24 relative scroll-mt-20 sm:scroll-mt-24">
      <motion.div
        initial={{ opacity: 0, y: 25 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="mb-14 text-center md:text-left"
      >
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary mb-2 justify-center md:justify-start">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          Transmission // Inquiries
        </div>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
          Initialize Contact
        </h2>
        <div className="w-20 h-1 bg-gradient-to-r from-primary to-cyan-400 rounded-full mx-auto md:mx-0 shadow-[0_0_12px_rgba(14,165,233,0.5)]"></div>
        <p className="text-muted-foreground mt-4 max-w-2xl mx-auto md:mx-0 text-base leading-relaxed">
          Interested in collaborating or have a question? Send me a message and I&apos;ll get back
          to you as soon as possible.
        </p>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-12">
        {/* Contact Info Cards */}
        <motion.div
          initial={{ opacity: 0, x: -25 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-1 space-y-6"
        >
          <div className="glass-panel p-5 sm:p-6 rounded-2xl flex items-start gap-4 hover:border-primary/40 hover:shadow-[0_8px_30px_-8px_rgba(14,165,233,0.2)] transition-all duration-300 group border border-white/5 backdrop-blur-md">
            <div className="p-3.5 bg-primary/10 text-primary border border-primary/20 rounded-xl group-hover:scale-110 group-hover:bg-primary/20 group-hover:shadow-[0_0_15px_rgba(14,165,233,0.3)] transition-all duration-300">
              <Mail size={22} />
            </div>
            <div>
              <h3 className="font-semibold text-base mb-1 text-foreground group-hover:text-primary transition-colors">
                Email
              </h3>
              {profileData.contact.email !== "YOUR_EMAIL_HERE" ? (
                <a
                  href={`mailto:${profileData.contact.email}`}
                  className="text-muted-foreground hover:text-foreground transition-colors text-sm break-all focus:outline-none focus:underline"
                >
                  {profileData.contact.email}
                </a>
              ) : (
                <span className="text-muted-foreground text-sm italic">Email not provided</span>
              )}
            </div>
          </div>

          <div className="glass-panel p-5 sm:p-6 rounded-2xl flex items-start gap-4 hover:border-primary/40 hover:shadow-[0_8px_30px_-8px_rgba(14,165,233,0.2)] transition-all duration-300 group border border-white/5 backdrop-blur-md">
            <div className="p-3.5 bg-primary/10 text-primary border border-primary/20 rounded-xl group-hover:scale-110 group-hover:bg-primary/20 group-hover:shadow-[0_0_15px_rgba(14,165,233,0.3)] transition-all duration-300">
              <Phone size={22} />
            </div>
            <div>
              <h3 className="font-semibold text-base mb-1 text-foreground group-hover:text-primary transition-colors">
                Phone
              </h3>
              {profileData.contact.phone && profileData.contact.phone !== "YOUR_PHONE_NUMBER_HERE" ? (
                <a
                  href={`tel:${profileData.contact.phone}`}
                  className="text-muted-foreground hover:text-foreground transition-colors text-sm focus:outline-none focus:underline"
                >
                  {profileData.contact.phone}
                </a>
              ) : (
                <span className="text-muted-foreground text-sm italic">Phone not provided</span>
              )}
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl flex items-start gap-4 border border-white/5 border-dashed backdrop-blur-md">
            <div className="p-3.5 bg-primary/5 text-primary/60 rounded-xl border border-primary/10">
              <Server size={22} />
            </div>
            <div>
              <h3 className="font-semibold text-base mb-1 text-foreground/80">System Status</h3>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Frontend UI Active.
                <br />
                Backend connection ready.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Contact Form */}
        <motion.div
          initial={{ opacity: 0, x: 25 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-2"
        >
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="glass-panel p-8 rounded-2xl space-y-6 border border-white/5 backdrop-blur-md"
          >
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="name" className="text-xs sm:text-sm font-medium text-foreground">
                  Name
                </label>
                <input
                  id="name"
                  {...register("name")}
                  className="w-full bg-[#0a0a0a]/80 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  placeholder="John Doe"
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <label htmlFor="email" className="text-xs sm:text-sm font-medium text-foreground">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  {...register("email")}
                  className="w-full bg-[#0a0a0a]/80 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  placeholder="john@example.com"
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="subject" className="text-xs sm:text-sm font-medium text-foreground">
                Subject
              </label>
              <input
                id="subject"
                {...register("subject")}
                className="w-full bg-[#0a0a0a]/80 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                placeholder="Project Inquiry"
              />
              {errors.subject && (
                <p className="text-xs text-destructive">{errors.subject.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="message" className="text-xs sm:text-sm font-medium text-foreground">
                Message
              </label>
              <textarea
                id="message"
                {...register("message")}
                rows={5}
                className="w-full bg-[#0a0a0a]/80 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all resize-none"
                placeholder="How can we work together?"
              />
              {errors.message && (
                <p className="text-xs text-destructive">{errors.message.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-8 py-3.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(14,165,233,0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
            >
              {isSubmitting ? "Sending..." : "Send Message"}
              {!isSubmitting && <Send size={18} />}
            </button>
          </form>
        </motion.div>
      </div>
    </section>
  );
}
