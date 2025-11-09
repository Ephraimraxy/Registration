import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Link2, Copy, Check, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const linkGeneratorSchema = z.object({
  days: z.number().min(0).max(365),
  hours: z.number().min(0).max(23),
});

type LinkGeneratorForm = z.infer<typeof linkGeneratorSchema>;

export function LinkGenerator() {
  const [generatedLink, setGeneratedLink] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<LinkGeneratorForm>({
    resolver: zodResolver(linkGeneratorSchema),
    defaultValues: {
      days: 7,
      hours: 0,
    },
  });

  const generateToken = () => {
    return `token_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  };

  const onSubmit = async (data: LinkGeneratorForm) => {
    setIsGenerating(true);
    try {
      const token = generateToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + data.days);
      expiresAt.setHours(expiresAt.getHours() + data.hours);

      await addDoc(collection(db, "accessLinks"), {
        token,
        expiresAt,
        createdAt: serverTimestamp(),
        isActive: true,
      });

      const baseUrl = window.location.origin;
      const link = `${baseUrl}/profile/${token}`;
      setGeneratedLink(link);
      
      toast({
        title: "Link Generated",
        description: "Access link has been created successfully",
      });
    } catch (error: any) {
      console.error("Error generating link:", error);
      toast({
        title: "Error",
        description: "Failed to generate link",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    toast({
      title: "Copied!",
      description: "Link copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          Generate Access Link
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full">
              <Link2 className="mr-2 h-4 w-4" />
              Generate New Link
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate Time-Limited Access Link</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="days"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Days</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            max="365"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="hours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hours</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            max="23"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isGenerating}>
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      "Generate"
                    )}
                  </Button>
                </div>
              </form>
            </Form>

            {generatedLink && (
              <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
                <Label>Generated Link:</Label>
                <div className="flex items-center gap-2">
                  <Input value={generatedLink} readOnly className="font-mono text-sm" />
                  <Button size="sm" onClick={copyToClipboard}>
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Expires in: {form.getValues("days")} day(s) and {form.getValues("hours")} hour(s)
                </p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

