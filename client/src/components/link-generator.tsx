import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, doc, updateDoc, deleteDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Link2, Copy, Check, Loader2, Trash2, Clock, Power, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const linkGeneratorSchema = z.object({
  days: z.number().min(0).max(365),
  hours: z.number().min(0).max(23),
});

type LinkGeneratorForm = z.infer<typeof linkGeneratorSchema>;

interface AccessLink {
  id: string;
  token: string;
  expiresAt: any;
  createdAt: any;
  isActive: boolean;
}

export function LinkGenerator() {
  const [generatedToken, setGeneratedToken] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [links, setLinks] = useState<AccessLink[]>([]);
  const [isLoadingLinks, setIsLoadingLinks] = useState(false);
  const [extendingLinkId, setExtendingLinkId] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<LinkGeneratorForm>({
    resolver: zodResolver(linkGeneratorSchema),
    defaultValues: {
      days: 7,
      hours: 0,
    },
  });

  useEffect(() => {
    loadLinks();
  }, []);

  const loadLinks = async () => {
    setIsLoadingLinks(true);
    try {
      const q = query(collection(db, "accessLinks"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const linksData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as AccessLink[];
      setLinks(linksData);
    } catch (error: any) {
      console.error("Error loading links:", error);
      toast({
        title: "Error",
        description: "Failed to load link history",
        variant: "destructive",
      });
    } finally {
      setIsLoadingLinks(false);
    }
  };

  const generateToken = () => {
    // Generate a longer, more random token that doesn't reveal the website structure
    const randomPart1 = Math.random().toString(36).substring(2, 15);
    const randomPart2 = Math.random().toString(36).substring(2, 15);
    const randomPart3 = Math.random().toString(36).substring(2, 15);
    const timestamp = Date.now().toString(36);
    // Combine to create a unique, undetectable token
    return `${randomPart1}${randomPart2}${timestamp}${randomPart3}`;
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
        expiresAt: Timestamp.fromDate(expiresAt),
        createdAt: serverTimestamp(),
        isActive: true,
      });

      setGeneratedToken(token);
      await loadLinks();
      
      toast({
        title: "Token Generated",
        description: "Access token has been created successfully",
      });
    } catch (error: any) {
      console.error("Error generating token:", error);
      toast({
        title: "Error",
        description: "Failed to generate token",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (token: string, linkId?: string) => {
    const baseUrl = window.location.origin;
    const fullLink = `${baseUrl}/profile/${token}`;
    navigator.clipboard.writeText(fullLink);
    if (linkId) {
      setCopiedLinkId(linkId);
    } else {
      setCopied(true);
    }
    toast({
      title: "Copied!",
      description: "Full link copied to clipboard",
    });
    setTimeout(() => {
      if (linkId) {
        setCopiedLinkId(null);
      } else {
        setCopied(false);
      }
    }, 2000);
  };

  const copyTokenOnly = (token: string, linkId?: string) => {
    navigator.clipboard.writeText(token);
    if (linkId) {
      setCopiedLinkId(linkId);
    } else {
      setCopied(true);
    }
    toast({
      title: "Copied!",
      description: "Token copied to clipboard",
    });
    setTimeout(() => {
      if (linkId) {
        setCopiedLinkId(null);
      } else {
        setCopied(false);
      }
    }, 2000);
  };

  const toggleLinkStatus = async (linkId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, "accessLinks", linkId), {
        isActive: !currentStatus,
      });
      await loadLinks();
      toast({
        title: "Success",
        description: `Link ${!currentStatus ? 'activated' : 'deactivated'} successfully`,
      });
    } catch (error: any) {
      console.error("Error toggling link status:", error);
      toast({
        title: "Error",
        description: "Failed to update link status",
        variant: "destructive",
      });
    }
  };

  const extendLinkTime = async (linkId: string, additionalDays: number, additionalHours: number) => {
    setExtendingLinkId(linkId);
    try {
      const link = links.find(l => l.id === linkId);
      if (!link) return;

      const currentExpiry = link.expiresAt?.toDate() || new Date();
      const newExpiry = new Date(currentExpiry);
      newExpiry.setDate(newExpiry.getDate() + additionalDays);
      newExpiry.setHours(newExpiry.getHours() + additionalHours);

      await updateDoc(doc(db, "accessLinks", linkId), {
        expiresAt: Timestamp.fromDate(newExpiry),
      });
      await loadLinks();
      toast({
        title: "Success",
        description: `Link expiration extended by ${additionalDays} day(s) and ${additionalHours} hour(s)`,
      });
    } catch (error: any) {
      console.error("Error extending link:", error);
      toast({
        title: "Error",
        description: "Failed to extend link expiration",
        variant: "destructive",
      });
    } finally {
      setExtendingLinkId(null);
    }
  };

  const deleteLink = async (linkId: string) => {
    try {
      await deleteDoc(doc(db, "accessLinks", linkId));
      await loadLinks();
      toast({
        title: "Success",
        description: "Link deleted successfully",
      });
    } catch (error: any) {
      console.error("Error deleting link:", error);
      toast({
        title: "Error",
        description: "Failed to delete link",
        variant: "destructive",
      });
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  };

  const isExpired = (expiresAt: any) => {
    if (!expiresAt) return false;
    const expiry = expiresAt.toDate ? expiresAt.toDate() : new Date(expiresAt);
    return expiry < new Date();
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
        <Tabs defaultValue="generate" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="generate">Generate</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
          
          <TabsContent value="generate" className="space-y-4">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full">
                  <Link2 className="mr-2 h-4 w-4" />
                  Generate New Token
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white dark:bg-gray-50 border-2 border-gray-200 dark:border-gray-300 shadow-xl max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-gray-900 dark:text-gray-900">Generate Time-Limited Access Token</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="days"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-900 dark:text-gray-900">Days</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                max="365"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                className="bg-white dark:bg-white text-gray-900 border-gray-300 focus:border-blue-500"
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
                            <FormLabel className="text-gray-900 dark:text-gray-900">Hours</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                max="23"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                className="bg-white dark:bg-white text-gray-900 border-gray-300 focus:border-blue-500"
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

                {generatedToken && (
                  <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-200 rounded-lg space-y-3 border border-gray-300">
                    <Label className="text-gray-900 dark:text-gray-900 font-semibold">Generated Access Token:</Label>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <Input 
                          value={generatedToken} 
                          readOnly 
                          className="font-mono text-xs bg-white dark:bg-white text-gray-900 border-gray-300 break-all" 
                        />
                        <Button size="sm" onClick={() => copyTokenOnly(generatedToken)} className="shrink-0">
                          {copied ? (
                            <>
                              <Check className="h-4 w-4 mr-1" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4 mr-1" />
                              Token
                            </>
                          )}
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input 
                          value={`${window.location.origin}/profile/${generatedToken}`} 
                          readOnly 
                          className="font-mono text-xs bg-white dark:bg-white text-gray-900 border-gray-300 break-all" 
                        />
                        <Button size="sm" onClick={() => copyToClipboard(generatedToken)} className="shrink-0">
                          {copied ? (
                            <>
                              <Check className="h-4 w-4 mr-1" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4 mr-1" />
                              Full Link
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-100 rounded border border-blue-200">
                      <p className="text-xs text-gray-700 dark:text-gray-700 font-medium">
                        💡 Share only the token above with users. They can access it at: <span className="font-mono">{window.location.origin}/profile/[token]</span>
                      </p>
                    </div>
                    <p className="text-xs text-gray-700 dark:text-gray-700">
                      Expires in: {form.getValues("days")} day(s) and {form.getValues("hours")} hour(s)
                    </p>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {isLoadingLinks ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : links.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No links generated yet.</p>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {links.map((link) => {
                  const expired = isExpired(link.expiresAt);
                  return (
                    <div
                      key={link.id}
                      className="p-4 border rounded-lg bg-white dark:bg-gray-50 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <code className="text-xs font-mono bg-gray-100 dark:bg-gray-200 px-2 py-1 rounded break-all">
                              {link.token.substring(0, 20)}...
                            </code>
                            {link.isActive ? (
                              <Badge className="bg-green-500">Active</Badge>
                            ) : (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                            {expired && (
                              <Badge variant="destructive">Expired</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <p className="text-xs text-muted-foreground">
                              Created: {formatDate(link.createdAt)}
                            </p>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyTokenOnly(link.token, link.id)}
                              className="h-6 px-2 text-xs"
                              title="Copy token only"
                            >
                              {copiedLinkId === link.id ? (
                                <Check className="h-3 w-3 text-green-600" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyToClipboard(link.token, link.id)}
                              className="h-6 px-2 text-xs"
                              title="Copy full link"
                            >
                              {copiedLinkId === link.id ? (
                                <Check className="h-3 w-3 text-green-600" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Expires: {formatDate(link.expiresAt)}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant={link.isActive ? "destructive" : "default"}
                            onClick={() => toggleLinkStatus(link.id, link.isActive)}
                            className="text-xs"
                          >
                            <Power className="h-3 w-3 mr-1" />
                            {link.isActive ? "Deactivate" : "Activate"}
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline" className="text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                Extend
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-white dark:bg-gray-50">
                              <DialogHeader>
                                <DialogTitle>Extend Link Expiration</DialogTitle>
                              </DialogHeader>
                              <div className="grid grid-cols-2 gap-4 py-4">
                                <div>
                                  <Label>Additional Days</Label>
                                  <Input
                                    type="number"
                                    id="extend-days"
                                    min="0"
                                    max="365"
                                    defaultValue="7"
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <Label>Additional Hours</Label>
                                  <Input
                                    type="number"
                                    id="extend-hours"
                                    min="0"
                                    max="23"
                                    defaultValue="0"
                                    className="mt-1"
                                  />
                                </div>
                              </div>
                              <div className="flex justify-end gap-2">
                                <Button
                                  onClick={() => {
                                    const days = parseInt((document.getElementById("extend-days") as HTMLInputElement)?.value || "0");
                                    const hours = parseInt((document.getElementById("extend-hours") as HTMLInputElement)?.value || "0");
                                    extendLinkTime(link.id, days, hours);
                                  }}
                                  disabled={extendingLinkId === link.id}
                                >
                                  {extendingLinkId === link.id ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Extending...
                                    </>
                                  ) : (
                                    "Extend"
                                  )}
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="destructive" className="text-xs">
                                <Trash2 className="h-3 w-3 mr-1" />
                                Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-white dark:bg-gray-50">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Link?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete this access link. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteLink(link.id)} className="bg-destructive">
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
