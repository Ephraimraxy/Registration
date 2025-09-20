import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema, type InsertUser } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, User, MapPin, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { validateRegistrationData } from "@/lib/firebase";
import { flexibleAssignRoomAndTag } from "@/lib/flexible-registration-utils";
import { validateAvailability } from "@/lib/availability-utils";

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT", "Gombe", "Imo",
  "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa",
  "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba",
  "Yobe", "Zamfara"
];

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

interface RegistrationFormProps {
  onSuccess: (user: any) => void;
}

export function RegistrationForm({ onSuccess }: RegistrationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationProgress, setRegistrationProgress] = useState(0);
  const [registrationStatus, setRegistrationStatus] = useState<'idle' | 'validating' | 'checking-availability' | 'finding-room' | 'finding-tag' | 'creating-user' | 'success' | 'error'>('idle');
  const [selectedState, setSelectedState] = useState<string>("");
  const [availabilityStatus, setAvailabilityStatus] = useState<{
    hasAvailableRooms: boolean;
    hasAvailableTags: boolean;
    availableRoomCount: number;
    availableTagCount: number;
  } | null>(null);
  const { toast } = useToast();

  // Check availability when gender changes
  const checkAvailability = async (gender: string) => {
    if (!gender) return;
    
    try {
      const availability = await validateAvailability(gender);
      setAvailabilityStatus(availability);
      
      if (!availability.hasAvailableRooms && !availability.hasAvailableTags) {
        toast({
          title: "No Resources Available",
          description: "No rooms or tags available at the moment. Registration will be pending until resources are added.",
          variant: "destructive",
        });
      } else if (!availability.hasAvailableRooms) {
        toast({
          title: "No Rooms Available",
          description: `No rooms available for ${gender} students. Room will be assigned when available.`,
          variant: "destructive",
        });
      } else if (!availability.hasAvailableTags) {
        toast({
          title: "No Tags Available",
          description: "No tags available at the moment. Tag will be assigned when available.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error checking availability:", error);
    }
  };

  const form = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      firstName: "",
      surname: "",
      middleName: "",
      dob: "",
      gender: "Male",
      phone: "",
      email: "",
      stateOfOrigin: "",
      lga: "",
    },
  });

  const onSubmit = async (data: InsertUser) => {
    setIsSubmitting(true);
    setRegistrationStatus('validating');
    setRegistrationProgress(10);
    
    try {
      // Enhanced validation before processing
      const validation = validateRegistrationData(data);
      if (!validation.isValid) {
        setRegistrationStatus('error');
        toast({
          title: "Validation Error",
          description: validation.errors.join(", "),
          variant: "destructive",
        });
        setIsSubmitting(false);
        setRegistrationStatus('idle');
        setRegistrationProgress(0);
        return;
      }

      // Use flexible assignment utility (allows partial assignments)
      setRegistrationStatus('finding-room');
      setRegistrationProgress(30);
      const result = await flexibleAssignRoomAndTag(data);
      if (!result.success || !result.userData) {
        throw new Error(result.error || 'Registration failed');
      }
      setRegistrationStatus('creating-user');
      setRegistrationProgress(80);
      
      setRegistrationProgress(100);
      setRegistrationStatus('success');
      
      // Create user object for success callback
      const newUser = {
        id: (result as any).userRef?.id || crypto.randomUUID?.() || String(Date.now()),
        ...result.userData,
        // createdAt from serverTimestamp is not immediately a Date client-side; show local time
        createdAt: new Date(),
      };
      
      onSuccess(newUser);
      
      // Determine success message based on what was assigned
      const hasRoom = result.roomAssignment;
      const hasTag = result.tagAssignment;
      const pendingRoom = result.pendingAssignments?.room;
      const pendingTag = result.pendingAssignments?.tag;
      
      let description = "Registration successful! ";
      if (hasRoom && hasTag) {
        description += "Room and tag assigned successfully!";
      } else if (hasRoom && pendingTag) {
        description += "Room assigned! Tag will be assigned when available.";
      } else if (hasTag && pendingRoom) {
        description += "Tag assigned! Room will be assigned when available.";
      } else if (pendingRoom && pendingTag) {
        description += "Both room and tag will be assigned when available.";
      }
      
      toast({
        title: "Registration Successful",
        description,
      });
      
      form.reset();
      
      // Reset progress after success
      setTimeout(() => {
        setRegistrationStatus('idle');
        setRegistrationProgress(0);
      }, 2000);
    } catch (error: any) {
      console.error("Registration error:", error);
      setRegistrationStatus('error');
      toast({
        title: "Registration Failed",
        description: error.message || "An error occurred during registration. Please try again.",
        variant: "destructive",
      });
      
      // Reset after error
      setTimeout(() => {
        setRegistrationStatus('idle');
        setRegistrationProgress(0);
      }, 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="max-w-3xl mx-auto">
        <Card className="shadow-lg">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-foreground mb-2">User Registration</h2>
              <p className="text-muted-foreground">Complete your registration and get your room assignment</p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" data-testid="form-registration">
                {/* Personal Information Section */}
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                    <User className="mr-2 h-5 w-5 text-primary" />
                    Personal Information
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your first name" {...field} data-testid="input-first-name" />
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
                          <FormLabel>Surname</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your surname" {...field} data-testid="input-surname" />
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
                            <Input placeholder="Enter your middle name" {...field} data-testid="input-middle-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="dob"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date of Birth</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-dob" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gender</FormLabel>
                          <Select onValueChange={(value) => {
                            field.onChange(value);
                            checkAvailability(value);
                          }} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-gender" className="bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700 focus:ring-0 focus:ring-offset-0">
                                <SelectValue placeholder="Select gender" className="text-gray-900 dark:text-gray-100" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-2 border-gray-300 dark:border-gray-700 shadow-2xl">
                              <SelectItem 
                                value="Male"
                                className="hover:bg-blue-50 dark:hover:bg-blue-900/30 focus:bg-blue-100 dark:focus:bg-blue-800/40 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] border-b border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                              >
                                <span className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                                  <span className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 shadow-sm"></span>
                                  👨 Male
                                </span>
                              </SelectItem>
                              <SelectItem 
                                value="Female"
                                className="hover:bg-rose-50 dark:hover:bg-rose-900/30 focus:bg-rose-100 dark:focus:bg-rose-800/40 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] border-b border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                              >
                                <span className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                                  <span className="w-3 h-3 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 shadow-sm"></span>
                                  👩 Female
                                </span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="08012345678" {...field} data-testid="input-phone" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="your.email@example.com" {...field} data-testid="input-email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="nin"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>National Identification Number (NIN)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="12345678901" 
                              maxLength={11}
                              {...field} 
                              data-testid="input-nin"
                              onChange={(e) => {
                                // Only allow digits
                                const value = e.target.value.replace(/\D/g, '');
                                field.onChange(value);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Location Information Section */}
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                    <MapPin className="mr-2 h-5 w-5 text-primary" />
                    Location Information
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="stateOfOrigin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State of Origin</FormLabel>
                          <Select onValueChange={(value) => {
                            field.onChange(value);
                            setSelectedState(value);
                            form.setValue("lga", ""); // Reset LGA when state changes
                          }} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-state" className="bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700 focus:ring-0 focus:ring-offset-0">
                                <SelectValue placeholder="Select state" className="text-gray-900 dark:text-gray-100" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="max-h-60 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-2 border-gray-300 dark:border-gray-700 shadow-2xl">
                              {NIGERIAN_STATES.map((state, index) => (
                                <SelectItem 
                                  key={state} 
                                  value={state}
                                  className={`transition-all duration-300 hover:shadow-lg hover:scale-[1.02] border-b border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 ${
                                    index % 6 === 0 ? 'hover:bg-blue-50 dark:hover:bg-blue-900/30 focus:bg-blue-100 dark:focus:bg-blue-800/40' :
                                    index % 6 === 1 ? 'hover:bg-emerald-50 dark:hover:bg-emerald-900/30 focus:bg-emerald-100 dark:focus:bg-emerald-800/40' :
                                    index % 6 === 2 ? 'hover:bg-violet-50 dark:hover:bg-violet-900/30 focus:bg-violet-100 dark:focus:bg-violet-800/40' :
                                    index % 6 === 3 ? 'hover:bg-amber-50 dark:hover:bg-amber-900/30 focus:bg-amber-100 dark:focus:bg-amber-800/40' :
                                    index % 6 === 4 ? 'hover:bg-rose-50 dark:hover:bg-rose-900/30 focus:bg-rose-100 dark:focus:bg-rose-800/40' :
                                    'hover:bg-indigo-50 dark:hover:bg-indigo-900/30 focus:bg-indigo-100 dark:focus:bg-indigo-800/40'
                                  }`}
                                >
                                  <span className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                                    <span className={`w-3 h-3 rounded-full shadow-sm ${
                                      index % 6 === 0 ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                                      index % 6 === 1 ? 'bg-gradient-to-r from-green-500 to-emerald-600' :
                                      index % 6 === 2 ? 'bg-gradient-to-r from-purple-500 to-violet-600' :
                                      index % 6 === 3 ? 'bg-gradient-to-r from-orange-500 to-amber-600' :
                                      index % 6 === 4 ? 'bg-gradient-to-r from-pink-500 to-rose-600' :
                                      'bg-gradient-to-r from-indigo-500 to-blue-600'
                                    }`}></span>
                                    {state}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="lga"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Local Government Area</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={!selectedState}>
                            <FormControl>
                              <SelectTrigger data-testid="select-lga" className="bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700 focus:ring-0 focus:ring-offset-0">
                                <SelectValue placeholder={selectedState ? "Select LGA" : "Select state first"} className="text-gray-900 dark:text-gray-100" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="max-h-60 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-2 border-gray-300 dark:border-gray-700 shadow-2xl">
                              {selectedState && NIGERIAN_LGAS[selectedState as keyof typeof NIGERIAN_LGAS]?.map((lga, index) => (
                                <SelectItem 
                                  key={lga} 
                                  value={lga}
                                  className={`transition-all duration-300 hover:shadow-lg hover:scale-[1.02] border-b border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 ${
                                    index % 5 === 0 ? 'hover:bg-emerald-50 dark:hover:bg-emerald-900/30 focus:bg-emerald-100 dark:focus:bg-emerald-800/40' :
                                    index % 5 === 1 ? 'hover:bg-cyan-50 dark:hover:bg-cyan-900/30 focus:bg-cyan-100 dark:focus:bg-cyan-800/40' :
                                    index % 5 === 2 ? 'hover:bg-sky-50 dark:hover:bg-sky-900/30 focus:bg-sky-100 dark:focus:bg-sky-800/40' :
                                    index % 5 === 3 ? 'hover:bg-blue-50 dark:hover:bg-blue-900/30 focus:bg-blue-100 dark:focus:bg-blue-800/40' :
                                    'hover:bg-indigo-50 dark:hover:bg-indigo-900/30 focus:bg-indigo-100 dark:focus:bg-indigo-800/40'
                                  }`}
                                >
                                  <span className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                                    <span className={`w-2 h-2 rounded-full shadow-sm ${
                                      index % 5 === 0 ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' :
                                      index % 5 === 1 ? 'bg-gradient-to-r from-teal-500 to-teal-600' :
                                      index % 5 === 2 ? 'bg-gradient-to-r from-cyan-500 to-cyan-600' :
                                      index % 5 === 3 ? 'bg-gradient-to-r from-sky-500 to-sky-600' :
                                      'bg-gradient-to-r from-blue-500 to-blue-600'
                                    }`}></span>
                                    {lga}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* VIP Status Checkbox */}
                    <FormField
                      control={form.control}
                      name="isVip"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-xl border-2 border-purple-200 dark:border-purple-700">
                            <FormControl>
                              <Checkbox
                                checked={field.value || false}
                                onCheckedChange={field.onChange}
                                data-testid="checkbox-vip"
                                className="w-5 h-5 border-2 border-purple-400 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                              />
                            </FormControl>
                            <div className="space-y-1">
                              <FormLabel className="text-purple-800 dark:text-purple-200 font-bold text-lg cursor-pointer">
                                👑 VIP Status
                              </FormLabel>
                              <p className="text-sm text-purple-600 dark:text-purple-300">
                                Check this if the person is a VIP and should be assigned to reserved rooms
                              </p>
                            </div>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Availability Status */}
                {availabilityStatus && (
                  <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-xl border border-blue-200 dark:border-blue-700">
                    <h4 className="font-bold text-lg text-blue-800 dark:text-blue-200 mb-3 flex items-center gap-2">
                      📊 Availability Status
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${availabilityStatus.hasAvailableRooms ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                        <div>
                          <div className="font-semibold text-gray-800 dark:text-gray-200">
                            {availabilityStatus.hasAvailableRooms ? '✅ Rooms Available' : '⏳ Rooms Pending'}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {availabilityStatus.hasAvailableRooms 
                              ? `${availabilityStatus.availableRoomCount} beds available`
                              : 'Will be assigned when available'
                            }
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${availabilityStatus.hasAvailableTags ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                        <div>
                          <div className="font-semibold text-gray-800 dark:text-gray-200">
                            {availabilityStatus.hasAvailableTags ? '✅ Tags Available' : '⏳ Tags Pending'}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {availabilityStatus.hasAvailableTags 
                              ? `${availabilityStatus.availableTagCount} tags available`
                              : 'Will be assigned when available'
                            }
                          </div>
                        </div>
                      </div>
                    </div>
                    {(!availabilityStatus.hasAvailableRooms || !availabilityStatus.hasAvailableTags) && (
                      <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                          💡 <strong>Flexible Registration:</strong> You can still register! Missing resources will be assigned automatically when they become available.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Progress Display */}
                {isSubmitting && (
                  <div className="space-y-4 py-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {registrationStatus === 'validating' && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
                        {registrationStatus === 'checking-availability' && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
                        {registrationStatus === 'finding-room' && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
                        {registrationStatus === 'finding-tag' && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
                        {registrationStatus === 'creating-user' && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
                        {registrationStatus === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
                        {registrationStatus === 'error' && <AlertCircle className="h-4 w-4 text-red-500" />}
                        <span className="text-sm font-medium">
                          {registrationStatus === 'validating' && 'Validating data...'}
                          {registrationStatus === 'checking-availability' && 'Checking availability...'}
                          {registrationStatus === 'finding-room' && 'Finding available room...'}
                          {registrationStatus === 'finding-tag' && 'Finding available tag...'}
                          {registrationStatus === 'creating-user' && 'Creating user account...'}
                          {registrationStatus === 'success' && 'Registration successful!'}
                          {registrationStatus === 'error' && 'Registration failed'}
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {Math.round(registrationProgress)}%
                      </span>
                    </div>
                    <Progress value={registrationProgress} className="h-2" />
                  </div>
                )}

                <div className="flex justify-center pt-4">
                  <Button 
                    type="submit" 
                    size="lg" 
                    disabled={isSubmitting}
                    className="px-8"
                    data-testid="button-register"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Registering...
                      </div>
                    ) : (
                      <>
                        <UserPlus className="mr-2 h-5 w-5" />
                        Register & Get Room Assignment
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

    </>
  );
}

