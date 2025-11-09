import { useState, useEffect } from "react";
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
import { UserPlus, User, MapPin, Loader2, CheckCircle, AlertCircle, Building, Tag, ChevronRight, ChevronLeft, Phone, Mail, FileText, CheckCircle2, Pen } from "lucide-react";
import { validateRegistrationData, db } from "@/lib/firebase";
import { flexibleAssignRoomAndTag } from "@/lib/flexible-registration-utils";
import { validateAvailability } from "@/lib/availability-utils";
import { fetchAvailableRooms, fetchAvailableTags, setupRoomTagListeners, type AvailableRoom, type AvailableTag } from "@/lib/room-tag-fetcher";
import { doc, onSnapshot } from "firebase/firestore";

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
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;
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
  const [availableRooms, setAvailableRooms] = useState<AvailableRoom[]>([]);
  const [availableTags, setAvailableTags] = useState<AvailableTag[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [selectedTagId, setSelectedTagId] = useState<string>("");
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [isLoadingTags, setIsLoadingTags] = useState(false);
  const [allowCrossGender, setAllowCrossGender] = useState(false);
  const [defaultState, setDefaultState] = useState<{ state: string; isActive: boolean } | null>(null);
  const { toast } = useToast();
  
  // Field animation states
  const [fieldAnimationActive, setFieldAnimationActive] = useState<Record<string, boolean>>({
    firstName: true,
    surname: true,
    middleName: true,
    dob: true,
    phone: true,
    email: true,
    nin: true,
  });

  // Animated placeholder hook
  const useAnimatedPlaceholder = (placeholderText: string, isActive: boolean) => {
    const [displayedText, setDisplayedText] = useState("");
    const [isTyping, setIsTyping] = useState(true);

    useEffect(() => {
      if (!isActive) {
        setDisplayedText("");
        setIsTyping(true);
        return;
      }

      let timeout: NodeJS.Timeout;
      let currentIndex = 0;

      const typeText = () => {
        if (currentIndex < placeholderText.length) {
          setDisplayedText(placeholderText.slice(0, currentIndex + 1));
          currentIndex++;
          timeout = setTimeout(typeText, 100);
        } else {
          timeout = setTimeout(() => {
            setIsTyping(false);
            const deleteText = () => {
              if (currentIndex > 0) {
                setDisplayedText(placeholderText.slice(0, currentIndex - 1));
                currentIndex--;
                timeout = setTimeout(deleteText, 50);
              } else {
                setIsTyping(true);
                timeout = setTimeout(typeText, 500);
              }
            };
            deleteText();
          }, 2000);
        }
      };

      timeout = setTimeout(typeText, 500);
      return () => clearTimeout(timeout);
    }, [placeholderText, isActive]);

    return { displayedText, isTyping };
  };

  // Animated placeholders for each field
  const animatedPlaceholders = {
    firstName: useAnimatedPlaceholder("Enter your first name", fieldAnimationActive.firstName),
    surname: useAnimatedPlaceholder("Enter your surname", fieldAnimationActive.surname),
    middleName: useAnimatedPlaceholder("Enter your middle name", fieldAnimationActive.middleName),
    dob: useAnimatedPlaceholder("Select your date of birth", fieldAnimationActive.dob),
    phone: useAnimatedPlaceholder("Enter your phone number", fieldAnimationActive.phone),
    email: useAnimatedPlaceholder("Enter your email address", fieldAnimationActive.email),
    nin: useAnimatedPlaceholder("Enter your NIN", fieldAnimationActive.nin),
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
            email: undefined,
      nin: undefined,
      stateOfOrigin: "",
      lga: "",
    },
  });
  
  const selectedGender = form.watch("gender");

  // Fetch rooms and tags when gender changes
  useEffect(() => {
    if (!selectedGender) {
      setAvailableRooms([]);
      setSelectedRoomId("");
      return;
    }

    let isMounted = true;

    setIsLoadingRooms(true);
    setIsLoadingTags(true);
    
    // Fetch rooms and tags with error handling
    Promise.all([
      fetchAvailableRooms(selectedGender as "Male" | "Female", allowCrossGender).catch(err => {
        console.error("Error fetching rooms:", err);
        return [];
      }),
      fetchAvailableTags().catch(err => {
        console.error("Error fetching tags:", err);
        return [];
      })
    ]).then(([rooms, tags]) => {
      if (!isMounted) return;
      
      setAvailableRooms(rooms);
      setIsLoadingRooms(false);
      setAvailableTags(tags);
      setIsLoadingTags(false);
      
      // Clear selection if current selection is no longer available
      setSelectedRoomId(prev => {
        if (prev && !rooms.find(r => r.id === prev)) {
          return "";
        }
        return prev;
      });
      
      setSelectedTagId(prev => {
        if (prev && !tags.find(t => t.id === prev)) {
          return "";
        }
        return prev;
      });
    });

    // Set up real-time listeners with error handling
    let cleanup: (() => void) | undefined;
    try {
      cleanup = setupRoomTagListeners(
        selectedGender as "Male" | "Female",
        (rooms) => {
          if (!isMounted) return;
          setAvailableRooms(rooms);
          setSelectedRoomId(prev => {
            if (prev && !rooms.find(r => r.id === prev)) {
              return "";
            }
            return prev;
          });
        },
        (tags) => {
          if (!isMounted) return;
          setAvailableTags(tags);
          setSelectedTagId(prev => {
            if (prev && !tags.find(t => t.id === prev)) {
              return "";
            }
            return prev;
          });
        },
        allowCrossGender
      );
    } catch (error) {
      console.error("Error setting up room/tag listeners:", error);
      setIsLoadingRooms(false);
      setIsLoadingTags(false);
    }

    return () => {
      isMounted = false;
      if (cleanup) {
        cleanup();
      }
    };
  }, [selectedGender, allowCrossGender]);

  // Load cross-gender setting
  useEffect(() => {
    const settingsRef = doc(db, "settings", "roomSettings");
    const unsubscribe = onSnapshot(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setAllowCrossGender(data.allowCrossGender || false);
      }
    }, (error) => {
      console.error("Error loading room settings:", error);
    });

    return () => unsubscribe();
  }, []);

  // Load default state setting
  useEffect(() => {
    const settingsRef = doc(db, "settings", "defaultStateSettings");
    const unsubscribe = onSnapshot(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.isActive && data.defaultState) {
          setDefaultState({ state: data.defaultState, isActive: true });
          // Auto-set the state in the form
          form.setValue("stateOfOrigin", data.defaultState);
          setSelectedState(data.defaultState);
        } else {
          setDefaultState(null);
        }
      } else {
        setDefaultState(null);
      }
    }, (error) => {
      console.error("Error loading default state settings:", error);
    });

    return () => unsubscribe();
  }, []);

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

  // Step validation functions
  const validateStep = async (step: number): Promise<boolean> => {
    const values = form.getValues();
    
    switch (step) {
      case 1: // Personal Information
        await form.trigger(['firstName', 'surname', 'dob', 'gender']);
        return !form.formState.errors.firstName && 
               !form.formState.errors.surname && 
               !form.formState.errors.dob && 
               !form.formState.errors.gender;
      case 2: // Contact Information
        await form.trigger(['phone']);
        if (values.email) await form.trigger(['email']);
        if (values.nin) await form.trigger(['nin']);
        return !form.formState.errors.phone && 
               !form.formState.errors.email && 
               !form.formState.errors.nin;
      case 3: // Location Information
        await form.trigger(['stateOfOrigin', 'lga']);
        return !form.formState.errors.stateOfOrigin && 
               !form.formState.errors.lga;
      case 4: // Room & Tag Selection (required)
        // Check if room and tag are selected
        if (!selectedRoomId || !selectedTagId) {
          return false;
        }
        return true;
      case 5: // Review (always valid)
        return true;
      default:
        return false;
    }
  };

  const handleNext = async () => {
    const isValid = await validateStep(currentStep);
    if (isValid && currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      let errorMessage = "Please fill in all required fields before proceeding.";
      if (currentStep === 4) {
        if (!selectedRoomId && !selectedTagId) {
          errorMessage = "Please select both a room and a tag before proceeding.";
        } else if (!selectedRoomId) {
          errorMessage = "Please select a room before proceeding.";
        } else if (!selectedTagId) {
          errorMessage = "Please select a tag before proceeding.";
        }
      }
      toast({
        title: "Validation Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

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
      // Include selected room/tag IDs if provided
      const registrationData = {
        ...data,
        selectedRoomId: selectedRoomId || undefined,
        selectedTagId: selectedTagId || undefined,
      };
      
      setRegistrationStatus('finding-room');
      setRegistrationProgress(30);
      const result = await flexibleAssignRoomAndTag(registrationData);
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

  const formValues = form.watch();
  const stepTitles = [
    "Personal Information",
    "Contact Information", 
    "Location Information",
    "Room & Tag Selection",
    "Review & Submit"
  ];
  const stepIcons = [User, Phone, MapPin, Building, CheckCircle2];

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 md:px-6">
        <Card className="shadow-lg">
        <CardContent className="p-3 sm:p-4 md:p-6 lg:p-8">
          <div className="text-center mb-4 sm:mb-6 md:mb-8">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-1 sm:mb-2">TRAINEE ACCREDITATION</h2>
            <p className="text-xs sm:text-sm md:text-base text-muted-foreground">Complete your registration in {totalSteps} steps</p>
          </div>

          {/* Step Progress Indicator */}
          <div className="mb-4 sm:mb-6 md:mb-8">
            {/* Mobile: Simplified progress */}
            <div className="block sm:hidden mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Step {currentStep} of {totalSteps}
                </span>
                <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                  {stepTitles[currentStep - 1]}
                </span>
              </div>
              <Progress value={(currentStep / totalSteps) * 100} className="h-2" />
            </div>
            
            {/* Desktop: Full progress indicator */}
            <div className="hidden sm:block">
              <div className="flex items-center justify-between mb-4 overflow-x-auto pb-2">
                {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => {
                  const StepIcon = stepIcons[step - 1];
                  const isActive = step === currentStep;
                  const isCompleted = step < currentStep;
                  return (
                    <div key={step} className="flex items-center flex-1 min-w-0">
                      <div className="flex flex-col items-center flex-1 min-w-0">
                        <div
                          className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all duration-300 flex-shrink-0 ${
                            isActive
                              ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-lg scale-110"
                              : isCompleted
                              ? "bg-green-500 text-white"
                              : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
                          ) : (
                            <StepIcon className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
                          )}
                        </div>
                        <p className={`text-[10px] sm:text-xs mt-1 sm:mt-2 text-center font-medium truncate w-full px-1 ${
                          isActive ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground"
                        }`}>
                          Step {step}
                        </p>
                        <p className={`text-[9px] sm:text-xs text-center truncate w-full px-1 ${
                          isActive ? "text-blue-600 dark:text-blue-400 font-semibold" : "text-muted-foreground"
                        }`}>
                          {stepTitles[step - 1]}
                        </p>
                      </div>
                      {step < totalSteps && (
                        <div className={`flex-1 h-1 mx-1 sm:mx-2 transition-all duration-300 min-w-[20px] ${
                          step < currentStep ? "bg-green-500" : "bg-gray-200 dark:bg-gray-700"
                        }`} />
                      )}
                    </div>
                  );
                })}
              </div>
              <Progress value={(currentStep / totalSteps) * 100} className="h-2" />
            </div>
            </div>

            <Form {...form}>
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  // Only allow submission when on step 5 and submit button is clicked
                  // This prevents auto-submission on Enter key press
                  return false;
                }} 
                className="space-y-6" 
                data-testid="form-registration"
                onKeyDown={(e) => {
                  // Prevent form submission on Enter key
                  if (e.key === 'Enter' && currentStep === totalSteps) {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }}
              >
                {/* Step 1: Personal Information */}
                {currentStep === 1 && (
                <div>
                    <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4 flex items-center">
                      <User className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                      <span className="truncate">Personal Information</span>
                  </h3>
                  
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                className="bg-gradient-to-r from-blue-600/30 via-indigo-600/30 to-purple-600/30 text-gray-900 dark:text-white border-0 animate-slow-pulse focus:animate-none focus:bg-gradient-to-r focus:from-blue-600/50 focus:via-indigo-600/50 focus:to-purple-600/50 transition-all duration-300" 
                                {...field} 
                                data-testid="input-first-name"
                                onFocus={(e) => {
                                  e.currentTarget.classList.remove('animate-slow-pulse');
                                  setFieldAnimationActive(prev => ({ ...prev, firstName: false }));
                                }}
                                onChange={(e) => {
                                  field.onChange(e);
                                  if (e.target.value) {
                                    setFieldAnimationActive(prev => ({ ...prev, firstName: false }));
                                  }
                                }}
                              />
                              {!field.value && (
                                <div className="absolute inset-0 flex items-center px-3 pointer-events-none">
                                  <Pen className="h-4 w-4 text-gray-500 dark:text-white/50 mr-2 animate-slow-pulse" />
                                  <span className="text-gray-500 dark:text-white/50 text-sm">
                                    {animatedPlaceholders.firstName.displayedText}
                                    {animatedPlaceholders.firstName.isTyping && <span className="animate-pulse">|</span>}
                                  </span>
                                </div>
                              )}
                            </div>
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
                            <div className="relative">
                              <Input 
                                className="bg-gradient-to-r from-blue-600/30 via-indigo-600/30 to-purple-600/30 text-gray-900 dark:text-white border-0 animate-slow-pulse focus:animate-none focus:bg-gradient-to-r focus:from-blue-600/50 focus:via-indigo-600/50 focus:to-purple-600/50 transition-all duration-300" 
                                {...field} 
                                data-testid="input-surname"
                                onFocus={(e) => {
                                  e.currentTarget.classList.remove('animate-slow-pulse');
                                  setFieldAnimationActive(prev => ({ ...prev, surname: false }));
                                }}
                                onChange={(e) => {
                                  field.onChange(e);
                                  if (e.target.value) {
                                    setFieldAnimationActive(prev => ({ ...prev, surname: false }));
                                  }
                                }}
                              />
                              {!field.value && (
                                <div className="absolute inset-0 flex items-center px-3 pointer-events-none">
                                  <Pen className="h-4 w-4 text-gray-500 dark:text-white/50 mr-2 animate-slow-pulse" />
                                  <span className="text-gray-500 dark:text-white/50 text-sm">
                                    {animatedPlaceholders.surname.displayedText}
                                    {animatedPlaceholders.surname.isTyping && <span className="animate-pulse">|</span>}
                                  </span>
                                </div>
                              )}
                            </div>
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
                            <div className="relative">
                              <Input 
                                className="bg-gradient-to-r from-blue-600/30 via-indigo-600/30 to-purple-600/30 text-gray-900 dark:text-white border-0 animate-slow-pulse focus:animate-none focus:bg-gradient-to-r focus:from-blue-600/50 focus:via-indigo-600/50 focus:to-purple-600/50 transition-all duration-300" 
                                {...field} 
                                data-testid="input-middle-name"
                                onFocus={(e) => {
                                  e.currentTarget.classList.remove('animate-slow-pulse');
                                  setFieldAnimationActive(prev => ({ ...prev, middleName: false }));
                                }}
                                onChange={(e) => {
                                  field.onChange(e);
                                  if (e.target.value) {
                                    setFieldAnimationActive(prev => ({ ...prev, middleName: false }));
                                  }
                                }}
                              />
                              {!field.value && (
                                <div className="absolute inset-0 flex items-center px-3 pointer-events-none">
                                  <Pen className="h-4 w-4 text-gray-500 dark:text-white/50 mr-2 animate-slow-pulse" />
                                  <span className="text-gray-500 dark:text-white/50 text-sm">
                                    {animatedPlaceholders.middleName.displayedText}
                                    {animatedPlaceholders.middleName.isTyping && <span className="animate-pulse">|</span>}
                                  </span>
                                </div>
                              )}
                            </div>
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
                            <div className="relative">
                              <Input 
                                type="date" 
                                className="bg-gradient-to-r from-blue-600/30 via-indigo-600/30 to-purple-600/30 text-gray-900 dark:text-white border-0 animate-slow-pulse focus:animate-none focus:bg-gradient-to-r focus:from-blue-600/50 focus:via-indigo-600/50 focus:to-purple-600/50 transition-all duration-300 [&::-webkit-calendar-picker-indicator]:invert dark:[&::-webkit-calendar-picker-indicator]:invert" 
                                {...field} 
                                data-testid="input-dob"
                                onFocus={(e) => {
                                  e.currentTarget.classList.remove('animate-slow-pulse');
                                  setFieldAnimationActive(prev => ({ ...prev, dob: false }));
                                }}
                                onChange={(e) => {
                                  field.onChange(e);
                                  if (e.target.value) {
                                    setFieldAnimationActive(prev => ({ ...prev, dob: false }));
                                  }
                                }}
                              />
                              {!field.value && (
                                <div className="absolute inset-0 flex items-center px-3 pointer-events-none">
                                  <Pen className="h-4 w-4 text-gray-500 dark:text-white/50 mr-2 animate-slow-pulse" />
                                  <span className="text-gray-500 dark:text-white/50 text-sm">
                                    {animatedPlaceholders.dob.displayedText}
                                    {animatedPlaceholders.dob.isTyping && <span className="animate-pulse">|</span>}
                                  </span>
                                </div>
                              )}
                            </div>
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
                            // Reset room selection when gender changes
                            setSelectedRoomId("");
                          }} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger 
                                data-testid="select-gender" 
                                className="bg-gradient-to-r from-blue-600/30 via-indigo-600/30 to-purple-600/30 text-gray-900 dark:text-white border-0 animate-slow-pulse focus:animate-none focus:bg-gradient-to-r focus:from-blue-600/50 focus:via-indigo-600/50 focus:to-purple-600/50 transition-all duration-300 focus:ring-0 focus:ring-offset-0 [&[data-state=open]]:animate-none [&[data-state=open]]:bg-gradient-to-r [&[data-state=open]]:from-blue-600/50 [&[data-state=open]]:via-indigo-600/50 [&[data-state=open]]:to-purple-600/50"
                                onFocus={(e) => e.currentTarget.classList.remove('animate-slow-pulse')}
                              >
                                <SelectValue className="text-gray-900 dark:text-white" />
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
                  </div>
                </div>
                )}

                {/* Step 2: Contact Information */}
                {currentStep === 2 && (
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4 flex items-center">
                      <Phone className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                      <span className="truncate">Contact Information</span>
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                              <div className="relative">
                                <Input 
                                  className="bg-gradient-to-r from-blue-600/30 via-indigo-600/30 to-purple-600/30 text-gray-900 dark:text-white border-0 animate-slow-pulse focus:animate-none focus:bg-gradient-to-r focus:from-blue-600/50 focus:via-indigo-600/50 focus:to-purple-600/50 transition-all duration-300" 
                                  {...field} 
                                  data-testid="input-phone"
                                  onFocus={(e) => {
                                    e.currentTarget.classList.remove('animate-slow-pulse');
                                    setFieldAnimationActive(prev => ({ ...prev, phone: false }));
                                  }}
                                  onChange={(e) => {
                                    field.onChange(e);
                                    if (e.target.value) {
                                      setFieldAnimationActive(prev => ({ ...prev, phone: false }));
                                    }
                                  }}
                                />
                                {!field.value && (
                                  <div className="absolute inset-0 flex items-center px-3 pointer-events-none">
                                    <Pen className="h-4 w-4 text-gray-500 dark:text-white/50 mr-2 animate-slow-pulse" />
                                    <span className="text-gray-500 dark:text-white/50 text-sm">
                                      {animatedPlaceholders.phone.displayedText}
                                      {animatedPlaceholders.phone.isTyping && <span className="animate-pulse">|</span>}
                                    </span>
                                  </div>
                                )}
                              </div>
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
                            <FormLabel>Email Address (Optional)</FormLabel>
                          <FormControl>
                              <div className="relative">
                                <Input 
                                  type="email" 
                                  className="bg-gradient-to-r from-blue-600/30 via-indigo-600/30 to-purple-600/30 text-gray-900 dark:text-white border-0 animate-slow-pulse focus:animate-none focus:bg-gradient-to-r focus:from-blue-600/50 focus:via-indigo-600/50 focus:to-purple-600/50 transition-all duration-300" 
                                  {...field} 
                                  data-testid="input-email"
                                  onFocus={(e) => {
                                    e.currentTarget.classList.remove('animate-slow-pulse');
                                    setFieldAnimationActive(prev => ({ ...prev, email: false }));
                                  }}
                                  onChange={(e) => {
                                    field.onChange(e);
                                    if (e.target.value) {
                                      setFieldAnimationActive(prev => ({ ...prev, email: false }));
                                    }
                                  }}
                                />
                                {!field.value && (
                                  <div className="absolute inset-0 flex items-center px-3 pointer-events-none">
                                    <Pen className="h-4 w-4 text-gray-500 dark:text-white/50 mr-2 animate-slow-pulse" />
                                    <span className="text-gray-500 dark:text-white/50 text-sm">
                                      {animatedPlaceholders.email.displayedText}
                                      {animatedPlaceholders.email.isTyping && <span className="animate-pulse">|</span>}
                                    </span>
                                  </div>
                                )}
                              </div>
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
                            <FormLabel>National Identification Number (NIN) (Optional)</FormLabel>
                          <FormControl>
                              <div className="relative">
                            <Input 
                              maxLength={11}
                                  className="bg-gradient-to-r from-blue-600/30 via-indigo-600/30 to-purple-600/30 text-gray-900 dark:text-white border-0 animate-slow-pulse focus:animate-none focus:bg-gradient-to-r focus:from-blue-600/50 focus:via-indigo-600/50 focus:to-purple-600/50 transition-all duration-300"
                              {...field} 
                              data-testid="input-nin"
                                  onFocus={(e) => {
                                    e.currentTarget.classList.remove('animate-slow-pulse');
                                    setFieldAnimationActive(prev => ({ ...prev, nin: false }));
                                  }}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '');
                                field.onChange(value);
                                    if (value) {
                                      setFieldAnimationActive(prev => ({ ...prev, nin: false }));
                                    }
                                  }}
                                />
                                {!field.value && (
                                  <div className="absolute inset-0 flex items-center px-3 pointer-events-none">
                                    <Pen className="h-4 w-4 text-gray-500 dark:text-white/50 mr-2 animate-slow-pulse" />
                                    <span className="text-gray-500 dark:text-white/50 text-sm">
                                      {animatedPlaceholders.nin.displayedText}
                                      {animatedPlaceholders.nin.isTyping && <span className="animate-pulse">|</span>}
                                    </span>
                                  </div>
                                )}
                              </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                )}

                {/* Step 3: Location Information */}
                {currentStep === 3 && (
                <div>
                    <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4 flex items-center">
                      <MapPin className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                      <span className="truncate">Location Information</span>
                  </h3>
                  
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <FormField
                      control={form.control}
                      name="stateOfOrigin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            State of Origin
                            {defaultState?.isActive && (
                              <span className="ml-2 text-xs text-muted-foreground">(Pre-selected)</span>
                            )}
                          </FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              field.onChange(value);
                              setSelectedState(value);
                              form.setValue("lga", ""); // Reset LGA when state changes
                            }} 
                            value={field.value}
                            disabled={defaultState?.isActive === true}
                          >
                            <FormControl>
                                <SelectTrigger 
                                  data-testid="select-state" 
                                  disabled={defaultState?.isActive === true}
                                  className="bg-gradient-to-r from-blue-600/30 via-indigo-600/30 to-purple-600/30 text-gray-900 dark:text-white border-0 animate-slow-pulse focus:animate-none focus:bg-gradient-to-r focus:from-blue-600/50 focus:via-indigo-600/50 focus:to-purple-600/50 transition-all duration-300 focus:ring-0 focus:ring-offset-0 [&[data-state=open]]:animate-none [&[data-state=open]]:bg-gradient-to-r [&[data-state=open]]:from-blue-600/50 [&[data-state=open]]:via-indigo-600/50 [&[data-state=open]]:to-purple-600/50 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                  <SelectValue className="text-gray-900 dark:text-white" />
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
                                <SelectTrigger 
                                  data-testid="select-lga" 
                                  className="bg-gradient-to-r from-blue-600/30 via-indigo-600/30 to-purple-600/30 text-gray-900 dark:text-white border-0 animate-slow-pulse focus:animate-none focus:bg-gradient-to-r focus:from-blue-600/50 focus:via-indigo-600/50 focus:to-purple-600/50 transition-all duration-300 focus:ring-0 focus:ring-offset-0 [&[data-state=open]]:animate-none [&[data-state=open]]:bg-gradient-to-r [&[data-state=open]]:from-blue-600/50 [&[data-state=open]]:via-indigo-600/50 [&[data-state=open]]:to-purple-600/50"
                                >
                                  <SelectValue className="text-gray-900 dark:text-white" />
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
                )}

                {/* Step 4: Room & Tag Selection */}
                {currentStep === 4 && (
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4 flex items-center">
                      <Building className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                      <span className="truncate">Room & Tag Selection</span>
                    </h3>
                    
                    <div className="space-y-6">
                      {/* Room Selection */}
                      {selectedGender && (
                        <div>
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Building className="h-4 w-4" />
                              Select Room *
                            </FormLabel>
                            <Select 
                              value={selectedRoomId || undefined} 
                              onValueChange={(value) => setSelectedRoomId(value || "")}
                              disabled={isLoadingRooms || availableRooms.length === 0}
                            >
                              <SelectTrigger 
                                className="bg-gradient-to-r from-blue-600/30 via-indigo-600/30 to-purple-600/30 text-gray-900 dark:text-white border-0 animate-slow-pulse focus:animate-none focus:bg-gradient-to-r focus:from-blue-600/50 focus:via-indigo-600/50 focus:to-purple-600/50 transition-all duration-300 focus:ring-0 focus:ring-offset-0 [&[data-state=open]]:animate-none [&[data-state=open]]:bg-gradient-to-r [&[data-state=open]]:from-blue-600/50 [&[data-state=open]]:via-indigo-600/50 [&[data-state=open]]:to-purple-600/50"
                              >
                                <SelectValue className="text-gray-900 dark:text-white" />
                              </SelectTrigger>
                              <SelectContent className="max-h-60 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-2 border-gray-300 dark:border-gray-700 shadow-2xl">
                                {availableRooms.map((room, index) => (
                                  <SelectItem 
                                    key={room.id} 
                                    value={room.id}
                                    className={`transition-all duration-300 hover:shadow-lg hover:scale-[1.02] border-b border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 ${
                                      index % 4 === 0 ? 'hover:bg-emerald-50 dark:hover:bg-emerald-900/30 focus:bg-emerald-100 dark:focus:bg-emerald-800/40' :
                                      index % 4 === 1 ? 'hover:bg-cyan-50 dark:hover:bg-cyan-900/30 focus:bg-cyan-100 dark:focus:bg-cyan-800/40' :
                                      index % 4 === 2 ? 'hover:bg-sky-50 dark:hover:bg-sky-900/30 focus:bg-sky-100 dark:focus:bg-sky-800/40' :
                                      'hover:bg-blue-50 dark:hover:bg-blue-900/30 focus:bg-blue-100 dark:focus:bg-blue-800/40'
                                    }`}
                                  >
                                    <span className="flex items-center justify-between w-full text-gray-900 dark:text-gray-100">
                                      <span className="flex items-center gap-2">
                                        <span className={`w-3 h-3 rounded-full shadow-sm ${
                                          index % 4 === 0 ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' :
                                          index % 4 === 1 ? 'bg-gradient-to-r from-cyan-500 to-cyan-600' :
                                          index % 4 === 2 ? 'bg-gradient-to-r from-sky-500 to-sky-600' :
                                          'bg-gradient-to-r from-blue-500 to-blue-600'
                                        }`}></span>
                                        <strong>
                                          {(() => {
                                            // Check if roomNumber already includes wing (range format like "A204", "RA1")
                                            // vs standard format where roomNumber is just "204" and wing is separate "A"
                                            const roomNumStr = room.roomNumber.toString();
                                            const wingStr = room.wing.toString();
                                            
                                            // If roomNumber starts with the wing prefix, it's range format
                                            if (roomNumStr.toUpperCase().startsWith(wingStr.toUpperCase())) {
                                              return roomNumStr; // Display as "A204", "RA1", etc.
                                            }
                                            // Otherwise, it's standard format
                                            return `${roomNumStr} (Wing ${wingStr})`; // Display as "204 (Wing A)"
                                          })()}
                                        </strong>
                                        {room.gender !== selectedGender && allowCrossGender && (
                                          <span className="text-xs text-purple-600 dark:text-purple-400 ml-1">
                                            ({room.gender === "Female" ? "Female Room" : "Male Room"})
                                          </span>
                                        )}
                                      </span>
                                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                        {room.availableBeds} bed{room.availableBeds !== 1 ? 's' : ''} available
                                      </span>
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {availableRooms.length === 0 && !isLoadingRooms && (
                              <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
                                ⚠️ No rooms available. Please contact administrator or wait for rooms to be added.
                              </p>
                            )}
                            {!selectedRoomId && availableRooms.length > 0 && (
                              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                                * Room selection is required
                              </p>
                            )}
                          </FormItem>
                        </div>
                      )}

                      {/* Tag Selection */}
                      <div>
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            Select Tag *
                          </FormLabel>
                          <Select 
                            value={selectedTagId || undefined} 
                            onValueChange={(value) => setSelectedTagId(value || "")}
                            disabled={isLoadingTags || availableTags.length === 0}
                          >
                            <SelectTrigger 
                              className="bg-gradient-to-r from-blue-600/30 via-indigo-600/30 to-purple-600/30 text-gray-900 dark:text-white border-0 animate-slow-pulse focus:animate-none focus:bg-gradient-to-r focus:from-blue-600/50 focus:via-indigo-600/50 focus:to-purple-600/50 transition-all duration-300 focus:ring-0 focus:ring-offset-0 [&[data-state=open]]:animate-none [&[data-state=open]]:bg-gradient-to-r [&[data-state=open]]:from-blue-600/50 [&[data-state=open]]:via-indigo-600/50 [&[data-state=open]]:to-purple-600/50"
                            >
                              <SelectValue className="text-gray-900 dark:text-white" />
                            </SelectTrigger>
                            <SelectContent className="max-h-60 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-2 border-gray-300 dark:border-gray-700 shadow-2xl">
                              {availableTags.map((tag, index) => (
                                <SelectItem 
                                  key={tag.id} 
                                  value={tag.id}
                                  className={`transition-all duration-300 hover:shadow-lg hover:scale-[1.02] border-b border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 ${
                                    index % 4 === 0 ? 'hover:bg-purple-50 dark:hover:bg-purple-900/30 focus:bg-purple-100 dark:focus:bg-purple-800/40' :
                                    index % 4 === 1 ? 'hover:bg-pink-50 dark:hover:bg-pink-900/30 focus:bg-pink-100 dark:focus:bg-pink-800/40' :
                                    index % 4 === 2 ? 'hover:bg-rose-50 dark:hover:bg-rose-900/30 focus:bg-rose-100 dark:focus:bg-rose-800/40' :
                                    'hover:bg-orange-50 dark:hover:bg-orange-900/30 focus:bg-orange-100 dark:focus:bg-orange-800/40'
                                  }`}
                                >
                                  <span className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                                    <span className={`w-3 h-3 rounded-full shadow-sm ${
                                      index % 4 === 0 ? 'bg-gradient-to-r from-purple-500 to-purple-600' :
                                      index % 4 === 1 ? 'bg-gradient-to-r from-pink-500 to-pink-600' :
                                      index % 4 === 2 ? 'bg-gradient-to-r from-rose-500 to-rose-600' :
                                      'bg-gradient-to-r from-orange-500 to-orange-600'
                                    }`}></span>
                                    Tag {tag.tagNumber}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {availableTags.length === 0 && !isLoadingTags && (
                            <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
                              ⚠️ No tags available. Please contact administrator or wait for tags to be added.
                            </p>
                          )}
                          {!selectedTagId && availableTags.length > 0 && (
                            <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                              * Tag selection is required
                            </p>
                          )}
                        </FormItem>
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
                      </div>
                    )}
                    </div>
                  </div>
                )}

                {/* Step 5: Review & Submit */}
                {currentStep === 5 && (
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4 flex items-center">
                      <CheckCircle2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                      <span className="truncate">Review & Submit</span>
                    </h3>
                    
                    <div className="space-y-4 p-3 sm:p-4 md:p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-xl border border-blue-200 dark:border-blue-700">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                          <h4 className="font-semibold text-sm text-muted-foreground mb-2">Personal Information</h4>
                          <div className="space-y-1 text-sm">
                            <p><strong>Name:</strong> {formValues.firstName} {formValues.middleName} {formValues.surname}</p>
                            <p><strong>Date of Birth:</strong> {formValues.dob ? new Date(formValues.dob).toLocaleDateString() : 'N/A'}</p>
                            <p><strong>Gender:</strong> {formValues.gender}</p>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm text-muted-foreground mb-2">Contact Information</h4>
                          <div className="space-y-1 text-sm">
                            <p><strong>Phone:</strong> {formValues.phone || 'N/A'}</p>
                            <p><strong>Email:</strong> {formValues.email || 'Not provided'}</p>
                            <p><strong>NIN:</strong> {formValues.nin || 'Not provided'}</p>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm text-muted-foreground mb-2">Location</h4>
                          <div className="space-y-1 text-sm">
                            <p><strong>State:</strong> {formValues.stateOfOrigin || 'N/A'}</p>
                            <p><strong>LGA:</strong> {formValues.lga || 'N/A'}</p>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm text-muted-foreground mb-2">Assignments</h4>
                          <div className="space-y-1 text-sm">
                            <p><strong>Room:</strong> {selectedRoomId ? availableRooms.find(r => r.id === selectedRoomId)?.roomNumber || 'Auto-assign' : 'Auto-assign'}</p>
                            <p><strong>Tag:</strong> {selectedTagId ? availableTags.find(t => t.id === selectedTagId)?.tagNumber || 'Auto-assign' : 'Auto-assign'}</p>
                            <p><strong>VIP:</strong> {formValues.isVip ? 'Yes' : 'No'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Progress Display */}
                {isSubmitting && (
                  <div className="space-y-3 sm:space-y-4 py-4 sm:py-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {registrationStatus === 'validating' && <Loader2 className="h-4 w-4 animate-spin text-blue-500 flex-shrink-0" />}
                        {registrationStatus === 'checking-availability' && <Loader2 className="h-4 w-4 animate-spin text-blue-500 flex-shrink-0" />}
                        {registrationStatus === 'finding-room' && <Loader2 className="h-4 w-4 animate-spin text-blue-500 flex-shrink-0" />}
                        {registrationStatus === 'finding-tag' && <Loader2 className="h-4 w-4 animate-spin text-blue-500 flex-shrink-0" />}
                        {registrationStatus === 'creating-user' && <Loader2 className="h-4 w-4 animate-spin text-blue-500 flex-shrink-0" />}
                        {registrationStatus === 'success' && <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />}
                        {registrationStatus === 'error' && <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />}
                        <span className="text-xs sm:text-sm font-medium truncate">
                          {registrationStatus === 'validating' && 'Validating data...'}
                          {registrationStatus === 'checking-availability' && 'Checking availability...'}
                          {registrationStatus === 'finding-room' && 'Finding available room...'}
                          {registrationStatus === 'finding-tag' && 'Finding available tag...'}
                          {registrationStatus === 'creating-user' && 'Creating user account...'}
                          {registrationStatus === 'success' && 'Registration successful!'}
                          {registrationStatus === 'error' && 'Registration failed'}
                        </span>
                      </div>
                      <span className="text-xs sm:text-sm text-muted-foreground flex-shrink-0">
                        {Math.round(registrationProgress)}%
                      </span>
                    </div>
                    <Progress value={registrationProgress} className="h-2" />
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 sm:gap-4 pt-4 sm:pt-6 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    disabled={currentStep === 1 || isSubmitting}
                    className="flex items-center justify-center gap-2 w-full sm:w-auto order-2 sm:order-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </Button>

                  {currentStep < totalSteps ? (
                    <Button
                      type="button"
                      onClick={handleNext}
                      className="flex items-center justify-center gap-2 w-full sm:w-auto bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 order-1 sm:order-2"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  ) : (
                  <Button 
                    type="button" 
                    size="lg" 
                    disabled={isSubmitting}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (currentStep === totalSteps && !isSubmitting) {
                        form.handleSubmit(onSubmit)(e);
                      }
                    }}
                      className="w-full sm:w-auto px-4 sm:px-8 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 order-1 sm:order-2"
                    data-testid="button-register"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                          <span className="text-sm sm:text-base">Registering...</span>
                      </div>
                    ) : (
                      <>
                          <UserPlus className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                          <span className="text-sm sm:text-base">SUBMIT</span>
                      </>
                    )}
                  </Button>
                  )}
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
  );
}

