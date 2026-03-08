import { Mail, Phone, MessageCircle, Clock, MapPin, ExternalLink, Send, HelpCircle, BookOpen, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const faqs = [
  {
    q: "How do I reset my password?",
    a: "Go to the login page and click 'Forgot Password'. Enter your email and follow the reset link sent to your inbox.",
  },
  {
    q: "Why can't I see my courses after signing up?",
    a: "New student accounts require admin approval. Once approved, your courses will appear on your dashboard.",
  },
  {
    q: "How do I upload a payment receipt?",
    a: "Navigate to Fees & Payments → Upload Receipt. Select your receipt image and it will be processed automatically by our AI system.",
  },
  {
    q: "My receipt was rejected. What do I do?",
    a: "Check the rejection reason in your payment history. Common issues include blurry images or incorrect institution names. Re-upload a clearer image or contact support.",
  },
  {
    q: "How does the clearance process work?",
    a: "Submit a clearance request from your dashboard. It goes through 4 approval steps: Finance Office → Library → Department Head → Final Admin. Track progress in real-time.",
  },
  {
    q: "How do I submit an assignment?",
    a: "Go to Assignments → select the assignment → Upload File. All file formats are accepted (max 100MB). You'll receive a confirmation once submitted.",
  },
  {
    q: "Where can I find my exam results?",
    a: "Navigate to Results & GPA on your student dashboard. Results appear once your lecturer enters them after the exam.",
  },
  {
    q: "I'm a lecturer and can't see my assigned courses.",
    a: "Your courses are assigned by the admin. If you believe there's an error, contact the system administrator.",
  },
];

export default function HelpSupportPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Help & Support</h1>
        <p className="text-muted-foreground text-sm mt-1">Get help with the BRIBTE Digital Campus System</p>
      </div>

      {/* Contact Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            Contact the Developer
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            For technical issues, feature requests, or system support — reach out directly to the system creator.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-background border">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <a href="mailto:musinguzij619@gmail.com" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                  musinguzij619@gmail.com
                </a>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-background border">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Phone className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Phone / WhatsApp</p>
                <a href="tel:+256761255464" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                  +256 761 255 464
                </a>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            <Button size="sm" className="rounded-xl" asChild>
              <a href="mailto:musinguzij619@gmail.com?subject=BRIBTE%20Support%20Request">
                <Send className="w-4 h-4 mr-1.5" />
                Send Email
              </a>
            </Button>
            <Button size="sm" variant="outline" className="rounded-xl" asChild>
              <a href="https://wa.me/256761255464?text=Hello%2C%20I%20need%20help%20with%20the%20BRIBTE%20system" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-1.5" />
                WhatsApp
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Support Hours */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-sm font-semibold">Support Hours</p>
              <p className="text-xs text-muted-foreground">Mon–Sat, 8AM–8PM EAT</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center flex-shrink-0">
              <HelpCircle className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-sm font-semibold">Response Time</p>
              <p className="text-xs text-muted-foreground">Within 2–4 hours</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-info" />
            </div>
            <div>
              <p className="text-sm font-semibold">Location</p>
              <p className="text-xs text-muted-foreground">Kampala, Uganda</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FAQs */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Frequently Asked Questions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-sm text-left hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* Quick Tips */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Quick Tips
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            "Always verify your email after signing up — you won't be able to log in without it.",
            "Upload clear, well-lit receipt images for faster AI processing and approval.",
            "Check your fee breakdown regularly to stay on top of your balance.",
            "Submit clearance requests early — each step requires separate admin approval.",
            "Use a strong password and never share your login credentials.",
          ].map((tip, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <Badge variant="secondary" className="text-[10px] px-1.5 mt-0.5 flex-shrink-0">{i + 1}</Badge>
              <p className="text-muted-foreground">{tip}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
