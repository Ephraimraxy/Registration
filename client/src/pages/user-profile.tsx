import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, AlertCircle, User, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const NIGERIAN_LGAS = {
  "Abia": ["Aba North", "Aba South", "Arochukwu", "Bende", "Ikwuano", "Isiala Ngwa North", "Isiala Ngwa South", "Isuikwuato", "Obi Ngwa", "Ohafia", "Osisioma", "Ugwunagbo", "Ukwa East", "Ukwa West", "Umuahia North", "Umuahia South", "Umu Nneochi"],
  "Adamawa": ["Demsa", "Fufure", "Ganye", "Gayuk", "Gombi", "Grie", "Hong", "Jada", "Lamurde", "Madagali", "Maiha", "Mayo Belwa", "Michika", "Mubi North", "Mubi South", "Numan", "Shelleng", "Song", "Toungo", "Yola North", "Yola South"],
  "Akwa Ibom": ["Abak", "Eastern Obolo", "Eket", "Esit Eket", "Essien Udim", "Etim Ekpo", "Etinan", "Ibeno", "Ibesikpo Asutan", "Ibiono-Ibom", "Ika", "Ikono", "Ikot Abasi", "Ini", "Itu", "Mbo", "Mkpat-Enin", "Nsit-Atai", "Nsit-Ibom", "Nsit-Ubium", "Obot Akara", "Okobo", "Onna", "Oron", "Oruk Anam", "Udung-Uko", "Ukanafun", "Uruan", "Urue-Offong/Oruko", "Uyo"],
  "Anambra": ["Aguata", "Anambra East", "Anambra West", "Anaocha", "Awka North", "Awka South", "Ayamelum", "Dunukofia", "Ekwusigo", "Idemili North", "Idemili South", "Ihiala", "Njikoka", "Nnewi North", "Nnewi South", "Ogbaru", "Onitsha North", "Onitsha South", "Orumba North", "Orumba South", "Oyi"],
  "Bauchi": ["Alkaleri", "Bauchi", "Bogoro", "Damban", "Darazo", "Dass", "Gamawa", "Ganjuwa", "Giade", "Itas/Gadau", "Jama'are", "Katagum", "Kirfi", "Misau", "Ningi", "Shira", "Tafawa Balewa", "Toro", "Warji", "Zaki"],
  "Bayelsa": ["Brass", "Ekeremor", "Kolokuma/Opokuma", "Nembe", "Ogbia", "Sagbama", "Southern Ijaw", "Yenagoa"],
  "Benue": ["Ado", "Agatu", "Apa", "Buruku", "Gboko", "Guma", "Gwer East", "Gwer West", "Katsina-Ala", "Konshisha", "Kwande", "Logo", "Makurdi", "Obi", "Ogbadibo", "Ohimini", "Oju", "Okpokwu", "Otukpo", "Tarka", "Ukum", "Ushongo", "Vandeikya"],
  "Borno": ["Abadam", "Askira/Uba", "Bama", "Bayo", "Biu", "Chibok", "Damboa", "Dikwa", "Gubio", "Guzamala", "Gwoza", "Hawul", "Jere", "Kaga", "Kala/Balge", "Konduga", "Kukawa", "Kwaya Kusar", "Mafa", "Magumeri", "Maiduguri", "Marte", "Mobbar", "Monguno", "Ngala", "Nganzai", "Shani"],
  "Cross River": ["Abi", "Akamkpa", "Akpabuyo", "Bakassi", "Bekwarra", "Biase", "Boki", "Calabar Municipal", "Calabar South", "Etung", "Ikom", "Obanliku", "Obubra", "Obudu", "Odukpani", "Ogoja", "Yakuur", "Yala"],
  "Delta": ["Aniocha North", "Aniocha South", "Bomadi", "Burutu", "Ethiope East", "Ethiope West", "Ika North East", "Ika South", "Isoko North", "Isoko South", "Ndokwa East", "Ndokwa West", "Okpe", "Oshimili North", "Oshimili South", "Patani", "Sapele", "Udu", "Ughelli North", "Ughelli South", "Ukwuani", "Uvwie", "Warri North", "Warri South", "Warri South West"],
  "Ebonyi": ["Abakaliki", "Afikpo North", "Afikpo South", "Ebonyi", "Ezza North", "Ezza South", "Ikwo", "Ishielu", "Ivo", "Izzi", "Ohaozara", "Ohaukwu", "Onicha"],
  "Edo": ["Akoko-Edo", "Egor", "Esan Central", "Esan North-East", "Esan South-East", "Esan West", "Etsako Central", "Etsako East", "Etsako West", "Igueben", "Ikpoba Okha", "Orhionmwon", "Oredo", "Ovia North-East", "Ovia South-West", "Owan East", "Owan West", "Uhunmwonde"],
  "Ekiti": ["Ado Ekiti", "Efon", "Ekiti East", "Ekiti South-West", "Ekiti West", "Emure", "Gbonyin", "Ido Osi", "Ijero", "Ikole", "Ilejemeje", "Irepodun/Ifelodun", "Ise/Orun", "Moba", "Oye"],
  "Enugu": ["Aninri", "Awgu", "Enugu East", "Enugu North", "Enugu South", "Ezeagu", "Igbo Etiti", "Igbo Eze North", "Igbo Eze South", "Isi Uzo", "Nkanu East", "Nkanu West", "Nsukka", "Oji River", "Udenu", "Udi", "Uzo Uwani"],
  "FCT": ["Abaji", "Bwari", "Gwagwalada", "Kuje", "Kwali", "Municipal Area Council"],
  "Gombe": ["Akko", "Balanga", "Billiri", "Dukku", "Funakaye", "Gombe", "Kaltungo", "Kwami", "Nafada", "Shongom", "Yamaltu/Deba"],
  "Imo": ["Aboh Mbaise", "Ahiazu Mbaise", "Ehime Mbano", "Ezinihitte", "Ideato North", "Ideato South", "Ihitte/Uboma", "Ikeduru", "Isiala Mbano", "Isu", "Mbaitoli", "Ngor Okpala", "Njaba", "Nkwerre", "Nwangele", "Obowo", "Oguta", "Ohaji/Egbema", "Okigwe", "Orlu", "Orsu", "Oru East", "Oru West", "Owerri Municipal", "Owerri North", "Owerri West", "Unuimo"],
  "Jigawa": ["Auyo", "Babura", "Biriniwa", "Birnin Kudu", "Buji", "Dutse", "Gagarawa", "Garki", "Gumel", "Guri", "Gwaram", "Gwiwa", "Hadejia", "Jahun", "Kafin Hausa", "Kazaure", "Kiri Kasama", "Kiyawa", "Kaugama", "Maigatari", "Malam Madori", "Miga", "Ringim", "Roni", "Sule Tankarkar", "Taura", "Yankwashi"],
  "Kaduna": ["Birnin Gwari", "Chikun", "Giwa", "Igabi", "Ikara", "Jaba", "Jema'a", "Kachia", "Kaduna North", "Kaduna South", "Kagarko", "Kajuru", "Kaura", "Kauru", "Kubau", "Kudan", "Lere", "Makarfi", "Sabon Gari", "Sanga", "Soba", "Zangon Kataf", "Zaria"],
  "Kano": ["Ajingi", "Albasu", "Bagwai", "Bebeji", "Bichi", "Bunkure", "Dala", "Dambatta", "Dawakin Kudu", "Dawakin Tofa", "Doguwa", "Fagge", "Gabasawa", "Garko", "Garun Mallam", "Gaya", "Gezawa", "Gwale", "Gwarzo", "Kabo", "Kano Municipal", "Karaye", "Kibiya", "Kiru", "Kumbotso", "Kunchi", "Kura", "Madobi", "Makoda", "Minjibir", "Nasarawa", "Rano", "Rimin Gado", "Rogo", "Shanono", "Sumaila", "Takai", "Tarauni", "Tofa", "Tsanyawa", "Tudun Wada", "Ungogo", "Warawa", "Wudil"],
  "Katsina": ["Bakori", "Batagarawa", "Batsari", "Baure", "Bindawa", "Charanchi", "Dandume", "Danja", "Dan Musa", "Dutsin Ma", "Faskari", "Funtua", "Ingawa", "Jibia", "Kafur", "Kaita", "Kankara", "Kankia", "Katsina", "Kurfi", "Kusada", "Mai'Adua", "Malumfashi", "Mani", "Mashi", "Matazu", "Musawa", "Rimi", "Sabuwa", "Safana", "Sandamu", "Zango"],
  "Kebbi": ["Aleiro", "Arewa Dandi", "Argungu", "Augie", "Bagudo", "Bunza", "Dandi", "Fakai", "Gwandu", "Jega", "Kalgo", "Koko/Besse", "Maiyama", "Ngaski", "Sakaba", "Shanga", "Suru", "Wasagu/Danko", "Yauri", "Zuru"],
  "Kogi": ["Adavi", "Ajaokuta", "Ankpa", "Bassa", "Dekina", "Ibaji", "Idah", "Igalamela Odolu", "Ijumu", "Kabba/Bunu", "Kogi", "Lokoja", "Mopa Muro", "Ofu", "Ogori/Magongo", "Okehi", "Okene", "Olamaboro", "Omala", "Yagba East", "Yagba West"],
  "Kwara": ["Asa", "Baruten", "Edu", "Ekiti", "Ifelodun", "Ilorin East", "Ilorin South", "Ilorin West", "Irepodun", "Isin", "Kaiama", "Moro", "Offa", "Oke Ero", "Oyun", "Pategi"],
  "Lagos": ["Agege", "Ajeromi-Ifelodun", "Alimosho", "Amuwo-Odofin", "Apapa", "Badagry", "Epe", "Eti Osa", "Ibeju-Lekki", "Ifako-Ijaiye", "Ikeja", "Ikorodu", "Kosofe", "Lagos Island", "Lagos Mainland", "Mushin", "Ojo", "Oshodi-Isolo", "Shomolu", "Surulere"],
  "Nasarawa": ["Akwanga", "Awe", "Doma", "Karu", "Keana", "Keffi", "Kokona", "Lafia", "Nasarawa", "Nasarawa Egon", "Obi", "Toto", "Wamba"],
  "Niger": ["Agaie", "Agwara", "Bida", "Borgu", "Bosso", "Chanchaga", "Edati", "Gbako", "Gurara", "Katcha", "Kontagora", "Lapai", "Lavun", "Magama", "Mariga", "Mashegu", "Mokwa", "Moya", "Paikoro", "Rafi", "Rijau", "Shiroro", "Suleja", "Tafa", "Wushishi"],
  "Ogun": ["Abeokuta North", "Abeokuta South", "Ado-Odo/Ota", "Egbado North", "Egbado South", "Ewekoro", "Ifo", "Ijebu East", "Ijebu North", "Ijebu North East", "Ijebu Ode", "Ikenne", "Imeko Afon", "Ipokia", "Obafemi Owode", "Odeda", "Odogbolu", "Ogun Waterside", "Remo North", "Shagamu"],
  "Ondo": ["Akoko North-East", "Akoko North-West", "Akoko South-West", "Akoko South-East", "Akure North", "Akure South", "Ese Odo", "Idanre", "Ifedore", "Ilaje", "Ile Oluji/Okeigbo", "Irele", "Odigbo", "Okitipupa", "Ondo East", "Ondo West", "Ose", "Owo"],
  "Osun": ["Atakunmosa East", "Atakunmosa West", "Aiyedaade", "Aiyedire", "Boluwaduro", "Boripe", "Ede North", "Ede South", "Ife Central", "Ife East", "Ife North", "Ife South", "Egbedore", "Ejigbo", "Ifedayo", "Ifelodun", "Ila", "Ilesa East", "Ilesa West", "Irepodun", "Irewole", "Isokan", "Iwo", "Obokun", "Odo Otin", "Ola Oluwa", "Olorunda", "Oriade", "Orolu", "Osogbo"],
  "Oyo": ["Afijio", "Akinyele", "Atiba", "Atisbo", "Egbeda", "Ibadan North", "Ibadan North-East", "Ibadan North-West", "Ibadan South-East", "Ibadan South-West", "Ibarapa Central", "Ibarapa East", "Ibarapa North", "Ido", "Irepo", "Iseyin", "Itesiwaju", "Iwajowa", "Kajola", "Lagelu", "Ogbomoso North", "Ogbomoso South", "Ogo Oluwa", "Olorunsogo", "Oluyole", "Ona Ara", "Orelope", "Ori Ire", "Oyo", "Oyo East", "Saki East", "Saki West", "Surulere"],
  "Plateau": ["Bokkos", "Barkin Ladi", "Bassa", "Jos East", "Jos North", "Jos South", "Kanam", "Kanke", "Langtang North", "Langtang South", "Mangu", "Mikang", "Pankshin", "Qua'an Pan", "Riyom", "Shendam", "Wase"],
  "Rivers": ["Abua/Odual", "Ahoada East", "Ahoada West", "Akuku-Toru", "Andoni", "Asari-Toru", "Bonny", "Degema", "Eleme", "Emuoha", "Etche", "Gokana", "Ikwerre", "Khana", "Obio/Akpor", "Ogba/Egbema/Ndoni", "Ogu/Bolo", "Okrika", "Omuma", "Opobo/Nkoro", "Oyigbo", "Port Harcourt", "Tai"],
  "Sokoto": ["Binji", "Bodinga", "Dange Shuni", "Gada", "Goronyo", "Gudu", "Gwadabawa", "Illela", "Isa", "Kebbe", "Kware", "Rabah", "Sabon Birni", "Shagari", "Silame", "Sokoto North", "Sokoto South", "Tambuwal", "Tangaza", "Tureta", "Wamako", "Wurno", "Yabo"],
  "Taraba": ["Ardo Kola", "Bali", "Donga", "Gashaka", "Gassol", "Ibi", "Jalingo", "Karim Lamido", "Kurmi", "Lau", "Sardauna", "Takum", "Ussa", "Wukari", "Yorro", "Zing"],
  "Yobe": ["Bade", "Bursari", "Geidam", "Gujba", "Gulani", "Jakusko", "Karasuwa", "Machina", "Nangere", "Potiskum", "Tarmuwa", "Yunusari", "Yusufari"],
  "Zamfara": ["Anka", "Bakura", "Birnin Magaji/Kiyaw", "Bukkuyum", "Bungudu", "Gummi", "Gusau", "Kankara", "Maradun", "Maru", "Shinkafi", "Talata Mafara", "Chafe", "Zurmi"]
};

const editUserSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  surname: z.string().min(1, "Surname is required"),
  middleName: z.string().optional(),
  email: z.string().email("Valid email is required").optional().or(z.literal("")),
  phone: z.string().min(10, "Valid phone number is required"),
  lga: z.string().min(1, "LGA is required"),
  nin: z.string().regex(/^\d{11}$/, "NIN must contain only numbers and be exactly 11 digits").optional().or(z.literal("")),
  dob: z.string().min(1, "Date of birth is required"),
  specialization: z.string().min(1, "Please select your area of specialization"),
});

type EditUserForm = z.infer<typeof editUserSchema>;

interface UserData {
  id: string;
  firstName: string;
  surname: string;
  middleName?: string;
  email?: string;
  phone: string;
  lga: string;
  nin?: string;
  dob: string;
  gender: string;
  stateOfOrigin: string;
  roomNumber?: string;
  tagNumber?: string;
  specialization?: string;
}

interface UserProfileProps {
  token?: string;
}

export function UserProfile({ token: propToken }: UserProfileProps) {
  const [location] = useLocation();
  const [step, setStep] = useState<"welcome" | "tag-input" | "profile">("welcome");
  const [tagNumber, setTagNumber] = useState("");
  const [userData, setUserData] = useState<UserData | null>(null);
  const [specializations, setSpecializations] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isValidatingToken, setIsValidatingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [linkType, setLinkType] = useState<"full-edit" | "specialization-only" | null>(null);
  const { toast } = useToast();

  const form = useForm<EditUserForm>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      firstName: "",
      surname: "",
      middleName: "",
      email: "",
      phone: "",
      lga: "",
      nin: "",
      dob: "",
      specialization: "",
    },
  });

  // Extract token from URL or props
  useEffect(() => {
    let token = propToken;
    
    if (!token) {
      const pathParts = location.split("/");
      token = pathParts[pathParts.length - 1];
    }
    
    // Accept any token format (not just token_ prefix)
    if (token && token.length > 10) {
      validateToken(token);
    } else {
      setTokenValid(false);
      setIsValidatingToken(false);
    }
  }, [location, propToken]);

  // Load specializations
  useEffect(() => {
    loadSpecializations();
  }, []);

  const validateToken = async (token: string) => {
    try {
      // Remove any path or query parameters
      const cleanToken = token.split('?')[0].split('#')[0];
      
      const q = query(
        collection(db, "accessLinks"),
        where("token", "==", cleanToken),
        where("isActive", "==", true)
      );
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        setTokenValid(false);
        setIsValidatingToken(false);
        return;
      }

      const linkData = snapshot.docs[0].data();
      const expiresAt = linkData.expiresAt?.toDate();
      
      if (expiresAt && expiresAt < new Date()) {
        setTokenValid(false);
        setIsValidatingToken(false);
        toast({
          title: "Link Expired",
          description: "This access link has expired. Please contact the administrator.",
          variant: "destructive",
        });
        return;
      }

      // Get link type (default to full-edit for backward compatibility)
      const type = linkData.linkType || "full-edit";
      setLinkType(type as "full-edit" | "specialization-only");
      setTokenValid(true);
      setIsValidatingToken(false);
    } catch (error: any) {
      console.error("Error validating token:", error);
      setTokenValid(false);
      setIsValidatingToken(false);
    }
  };

  const loadSpecializations = async () => {
    try {
      const q = query(collection(db, "specializations"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
      }));
      setSpecializations(data);
    } catch (error: any) {
      console.error("Error loading specializations:", error);
    }
  };

  const normalizeTagNumber = (input: string): string | null => {
    const trimmed = input.trim();
    if (!trimmed) return null;
    
    // Remove any "TAG-" or "tag-" prefix (case insensitive)
    const cleaned = trimmed.replace(/^tag-?/i, '');
    
    // Check if it's a valid format (at least 3 digits, like 002, 012, etc.)
    if (!/^\d{3,}$/.test(cleaned)) {
      return null; // Reject single or double digits like "2" or "12"
    }
    
    // Try to find with different formats
    return cleaned;
  };

  const handleTagSubmit = async () => {
    const normalizedTag = normalizeTagNumber(tagNumber);
    
    if (!normalizedTag) {
      toast({
        title: "Error",
        description: "Please enter a valid tag number (e.g., 002 or TAG-002). Single digits are not accepted.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Try to find user with normalized tag number (with and without TAG- prefix)
      const possibleTags = [normalizedTag, `TAG-${normalizedTag}`, `tag-${normalizedTag}`];
      
      let foundUser = null;
      for (const tag of possibleTags) {
        const q = query(collection(db, "users"), where("tagNumber", "==", tag));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          foundUser = snapshot.docs[0];
          break;
        }
      }
      
      if (!foundUser) {
        toast({
          title: "Not Found",
          description: "No user found with this tag number. Please check and try again.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const userDoc = foundUser;
      const data = userDoc.data();
      
      const user: UserData = {
        id: userDoc.id,
        firstName: data.firstName || "",
        surname: data.surname || "",
        middleName: data.middleName || "",
        email: data.email || "",
        phone: data.phone || "",
        lga: data.lga || "",
        nin: data.nin || "",
        dob: data.dob || "",
        gender: data.gender || "",
        stateOfOrigin: data.stateOfOrigin || "",
        roomNumber: data.roomNumber || "",
        tagNumber: data.tagNumber || "",
        specialization: data.specialization || "",
      };

      setUserData(user);
      form.reset({
        firstName: user.firstName,
        surname: user.surname,
        middleName: user.middleName || "",
        email: user.email || "",
        phone: user.phone,
        lga: user.lga,
        nin: user.nin || "",
        dob: user.dob,
        specialization: user.specialization || "",
      });
      setStep("profile");
    } catch (error: any) {
      console.error("Error fetching user:", error);
      toast({
        title: "Error",
        description: "Failed to fetch user data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: EditUserForm) => {
    if (!userData) return;

    // For specialization-only mode, validate only specialization
    if (linkType === "specialization-only") {
      if (!data.specialization || data.specialization.trim() === "") {
        form.setError("specialization", {
          type: "manual",
          message: "Please select your area of specialization",
        });
        toast({
          title: "Validation Error",
          description: "Please select your area of specialization",
          variant: "destructive",
        });
        return;
      }
    } else {
      // For full-edit mode, validate all required fields
      const isValid = await form.trigger();
      if (!isValid) {
        return;
      }
    }

    setIsSaving(true);
    try {
      const userRef = doc(db, "users", userData.id);
      
      // If specialization-only mode, only update specialization
      if (linkType === "specialization-only") {
        await updateDoc(userRef, {
          specialization: data.specialization,
        });
        
        toast({
          title: "Success",
          description: "Your area of specialization has been updated successfully!",
        });
      } else {
        // Full edit mode - update all fields
        await updateDoc(userRef, {
          firstName: data.firstName,
          surname: data.surname,
          middleName: data.middleName || undefined,
          email: data.email || undefined,
          phone: data.phone,
          lga: data.lga,
          nin: data.nin || undefined,
          dob: data.dob,
          specialization: data.specialization,
        });

        toast({
          title: "Success",
          description: "Your profile has been updated successfully!",
        });
      }

      // Update local state
      setUserData({
        ...userData,
        ...data,
      });

      // Redirect to welcome page after 1.5 seconds
      setTimeout(() => {
        setStep("welcome");
        setTagNumber("");
        form.reset();
      }, 1500);
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isValidatingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Validating access...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <h2 className="text-2xl font-bold">Access Denied</h2>
              <p className="text-muted-foreground">
                This link is invalid or has expired. Please contact the administrator for a new access link.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-2xl mx-auto py-8">
        {step === "welcome" && (
          <Card className="shadow-lg">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-4">
                    <User className="h-12 w-12 text-white" />
                  </div>
                </div>
                <h1 className="text-3xl font-bold">Welcome!</h1>
                <p className="text-muted-foreground">
                  {linkType === "specialization-only"
                    ? "Please enter your tag number to view your details and select your area of specialization."
                    : "Please enter your tag number to access and update your profile information."}
                </p>
                <Button onClick={() => setStep("tag-input")} size="lg" className="mt-4">
                  Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "tag-input" && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Enter Your Tag Number</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="tagNumber">Tag Number</Label>
                  <Input
                    id="tagNumber"
                    value={tagNumber}
                    onChange={(e) => setTagNumber(e.target.value)}
                    placeholder="Enter your tag number"
                    className="mt-2"
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        handleTagSubmit();
                      }
                    }}
                  />
                </div>
                <Button onClick={handleTagSubmit} disabled={isLoading} className="w-full">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Continue"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "profile" && userData && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Your Profile Information</CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                {linkType === "specialization-only" 
                  ? "You can view your details below. Only the area of specialization can be selected and updated."
                  : "You can edit the fields below. Some fields are read-only."}
              </p>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Read-only fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                    <div>
                      <Label className="text-muted-foreground">Gender</Label>
                      <p className="font-medium">{userData.gender}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">State of Origin</Label>
                      <p className="font-medium">{userData.stateOfOrigin}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Room Number</Label>
                      <p className="font-medium">{userData.roomNumber || "Not assigned"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Tag Number</Label>
                      <p className="font-medium">{userData.tagNumber || "Not assigned"}</p>
                    </div>
                  </div>

                  {/* If specialization-only mode, show all details as read-only */}
                  {linkType === "specialization-only" ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                        <div>
                          <Label className="text-muted-foreground">First Name</Label>
                          <p className="font-medium">{userData.firstName}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Surname</Label>
                          <p className="font-medium">{userData.surname}</p>
                        </div>
                        {userData.middleName && (
                          <div>
                            <Label className="text-muted-foreground">Middle Name</Label>
                            <p className="font-medium">{userData.middleName}</p>
                          </div>
                        )}
                        <div>
                          <Label className="text-muted-foreground">Phone Number</Label>
                          <p className="font-medium">{userData.phone}</p>
                        </div>
                        {userData.email && (
                          <div>
                            <Label className="text-muted-foreground">Email Address</Label>
                            <p className="font-medium">{userData.email}</p>
                          </div>
                        )}
                        <div>
                          <Label className="text-muted-foreground">Local Government Area (LGA)</Label>
                          <p className="font-medium">{userData.lga}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Date of Birth</Label>
                          <p className="font-medium">{userData.dob ? new Date(userData.dob).toLocaleDateString() : "N/A"}</p>
                        </div>
                        {userData.nin && (
                          <div>
                            <Label className="text-muted-foreground">National Identification Number (NIN)</Label>
                            <p className="font-medium">{userData.nin}</p>
                          </div>
                        )}
                      </div>

                      {/* Only specialization is editable */}
                      <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-lg border border-purple-200 dark:border-purple-700">
                        <FormField
                          control={form.control}
                          name="specialization"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-base font-semibold">Area of Specialization *</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="bg-white dark:bg-white text-gray-900 border-gray-300 focus:border-blue-500 h-12 text-base">
                                    <SelectValue placeholder="Select your area of specialization" className="text-gray-900" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="bg-white dark:bg-white border-2 border-gray-200 shadow-xl max-h-[300px]">
                                  {specializations.map((spec) => (
                                    <SelectItem 
                                      key={spec.id} 
                                      value={spec.name}
                                      className="text-gray-900 hover:bg-blue-50 dark:hover:bg-blue-50 focus:bg-blue-100 dark:focus:bg-blue-100 py-3 text-base cursor-pointer"
                                    >
                                      <div className="flex flex-col">
                                        <span className="font-medium">{spec.name}</span>
                                        {spec.description && (
                                          <span className="text-xs text-gray-600 mt-1">{spec.description}</span>
                                        )}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  ) : (
                    /* Full edit mode - show all editable fields */
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="surname"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Surname *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="middleName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Middle Name (Optional)</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>Email Address (Optional)</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lga"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Local Government Area (LGA) *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={!userData?.stateOfOrigin}>
                            <FormControl>
                              <SelectTrigger className="bg-white dark:bg-white text-gray-900 border-gray-300 focus:border-blue-500">
                                <SelectValue placeholder="Select LGA" className="text-gray-900" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-white dark:bg-white border-2 border-gray-200 shadow-xl max-h-[300px]">
                              {userData?.stateOfOrigin && NIGERIAN_LGAS[userData.stateOfOrigin as keyof typeof NIGERIAN_LGAS]?.map((lga, index) => (
                                <SelectItem 
                                  key={lga} 
                                  value={lga}
                                  className="text-gray-900 hover:bg-blue-50 dark:hover:bg-blue-50 focus:bg-blue-100 dark:focus:bg-blue-100 py-2 cursor-pointer"
                                >
                                  {lga}
                                </SelectItem>
                              ))}
                              {(!userData?.stateOfOrigin || !NIGERIAN_LGAS[userData.stateOfOrigin as keyof typeof NIGERIAN_LGAS]) && (
                                <SelectItem value="" disabled className="text-gray-500">
                                  Please select a state first
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="dob"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date of Birth *</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="nin"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>National Identification Number (NIN) (Optional)</FormLabel>
                          <FormControl>
                            <Input
                              maxLength={11}
                              {...field}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '');
                                field.onChange(value);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                      <FormField
                        control={form.control}
                        name="specialization"
                        render={({ field }) => (
                          <FormItem className="sm:col-span-2">
                            <FormLabel>Area of Specialization *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="bg-white dark:bg-white text-gray-900 border-gray-300 focus:border-blue-500 h-12 text-base">
                                  <SelectValue placeholder="Select your area of specialization" className="text-gray-900" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-white dark:bg-white border-2 border-gray-200 shadow-xl max-h-[300px]">
                                {specializations.map((spec) => (
                                  <SelectItem 
                                    key={spec.id} 
                                    value={spec.name}
                                    className="text-gray-900 hover:bg-blue-50 dark:hover:bg-blue-50 focus:bg-blue-100 dark:focus:bg-blue-100 py-3 text-base cursor-pointer"
                                  >
                                    <div className="flex flex-col">
                                      <span className="font-medium">{spec.name}</span>
                                      {spec.description && (
                                        <span className="text-xs text-gray-600 mt-1">{spec.description}</span>
                                      )}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button type="submit" disabled={isSaving} size="lg">
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          {linkType === "specialization-only" ? "Submit Specialization" : "Save Changes"}
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

