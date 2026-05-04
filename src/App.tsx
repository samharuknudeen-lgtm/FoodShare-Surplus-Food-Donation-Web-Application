import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, 
  User, 
  LogOut, 
  Plus, 
  Search, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  History, 
  Star,
  ShieldCheck,
  Filter,
  Trash2,
  Edit2,
  Map as MapIcon,
  LayoutGrid,
  Camera,
  RefreshCw,
  ShieldAlert,
  Fingerprint,
  Package
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { User as UserType, Listing, Request as RequestType } from './types';

// Fix Leaflet marker icon issue
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// --- Components ---

const VerifiedBadge = ({ className = "w-4 h-4" }: { className?: string }) => (
  <div className={`inline-flex items-center justify-center bg-blue-500 text-white rounded-full p-0.5 shadow-sm ml-1 ${className}`} title="Verified User">
    <ShieldCheck className="w-full h-full" />
  </div>
);

const CameraSection = ({ 
  label, 
  onCapture, 
  capturedImage 
}: { 
  label: string, 
  onCapture: (img: string) => void, 
  capturedImage: string | null 
}) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isFlash, setIsFlash] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API not supported in this browser or context. Please use a modern browser and ensure the site is accessed via HTTPS.");
      }

      console.log("Requesting camera access...");
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false 
      });
      
      console.log("Stream obtained:", stream.id);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          console.log("Video metadata loaded. Dimensions:", videoRef.current?.videoWidth, "x", videoRef.current?.videoHeight);
          videoRef.current?.play().catch(e => console.error("Error playing video:", e));
        };
        setIsStreaming(true);
      }
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      alert(err.message || "Could not access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null; // Clear the stream
      setIsStreaming(false);
    }
  };

  const capture = () => {
    console.log("Capture triggered");
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        console.warn("Video not ready for capture yet.");
        return;
      }

      const context = canvas.getContext('2d');
      if (context) {
        setIsFlash(true);
        setTimeout(() => setIsFlash(false), 150);

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        try {
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imgData = canvas.toDataURL('image/jpeg', 0.8); 
          console.log("Captured image length:", imgData.length);
          onCapture(imgData);
          stopCamera();
        } catch (err) {
          console.error("Draw image failed:", err);
        }
      }
    }
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-slate-700">{label}</p>
      <div className="relative aspect-video bg-slate-100 rounded-2xl overflow-hidden border-2 border-dashed border-slate-200">
        {capturedImage ? (
          <div className="relative h-full">
            <img src={capturedImage} className="w-full h-full object-cover" />
            <button 
              onClick={() => { onCapture(''); startCamera(); }}
              className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors z-10"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="relative h-full">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className={`w-full h-full object-cover transition-opacity duration-300 ${isStreaming ? 'opacity-100' : 'opacity-0'}`} 
            />
            
            {isFlash && <div className="absolute inset-0 bg-white z-20 animate-pulse" />}
            
            {isStreaming && (
              <div className="absolute inset-0 pointer-events-none border-4 border-emerald-500/30 rounded-2xl m-8 flex items-center justify-center">
                <div className="w-48 h-64 border-2 border-dashed border-emerald-500/50 rounded-full flex items-center justify-center">
                  <span className="text-[10px] text-emerald-600/70 font-bold uppercase tracking-widest bg-emerald-50/50 px-2 py-1 rounded">Position Face Here</span>
                </div>
              </div>
            )}

            {!isStreaming ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                <Camera className="w-12 h-12 text-slate-300 mb-2" />
                <button 
                  onClick={startCamera}
                  className="px-6 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold shadow-sm hover:bg-slate-50 transition-all active:scale-95"
                >
                  Turn on Camera
                </button>
              </div>
            ) : (
              <button 
                onClick={capture}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 p-4 bg-emerald-500 text-white rounded-full shadow-lg hover:bg-emerald-600 transition-all scale-110 active:scale-95 z-10"
              >
                <Camera className="w-6 h-6" />
              </button>
            )}
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
};

const MapView = ({ listings, onAction }: { listings: Listing[], onAction: (l: Listing) => void }) => {
  const center: [number, number] = [6.9271, 79.8612]; // Default center (Colombo, Sri Lanka)
  
  return (
    <div className="h-[600px] w-full rounded-3xl overflow-hidden border border-slate-200 shadow-inner">
      <MapContainer center={center} zoom={11} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {listings.map(listing => {
          // Fallback coordinates if none provided
          const position: [number, number] = [
            listing.lat || center[0] + (Math.random() - 0.5) * 0.1,
            listing.lng || center[1] + (Math.random() - 0.5) * 0.1
          ];
          
          return (
            <Marker key={listing.id} position={position}>
              <Popup>
                <div className="p-1 min-w-[200px]">
                  <img 
                    src={listing.image_url || `https://picsum.photos/seed/${listing.food_type}/200/120`} 
                    className="w-full h-24 object-cover rounded-lg mb-2"
                    referrerPolicy="no-referrer"
                  />
                  <h3 className="font-bold text-slate-900">{listing.food_type}</h3>
                  <p className="text-xs text-slate-500 mb-0.5">{listing.remaining_quantity} {listing.unit} remaining</p>
                  <p className="text-[10px] text-slate-400 mb-2">Total: {listing.quantity} {listing.unit} • {listing.location}</p>
                  <p className="text-xs font-medium text-emerald-600 mb-3">Donor: {listing.donor_name}</p>
                  <button 
                    onClick={() => onAction(listing)}
                    className="w-full py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors"
                  >
                    Request Pickup
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

const ProfileStatusCard = ({ user, onVerify }: { user: UserType, onVerify: () => void }) => (
  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-lg mb-6">
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-xl font-display font-bold text-slate-900">Profile Status</h2>
    </div>
    
    <div className={`p-4 rounded-2xl flex items-center justify-between ${
      user.verification_status === 'verified' ? 'bg-blue-50 border border-blue-100' :
      user.verification_status === 'pending' ? 'bg-amber-50 border border-amber-100' : 'bg-slate-50 border border-slate-100'
    }`}>
      <div className="flex items-center">
        {user.verification_status === 'verified' ? (
          <ShieldCheck className="w-8 h-8 text-blue-500 mr-3" />
        ) : (
          <AlertCircle className="w-8 h-8 text-slate-400 mr-3" />
        )}
        <div>
          <p className="text-sm font-bold text-slate-900 uppercase tracking-tight leading-none mb-1">Identity Verification</p>
          <p className="text-xs text-slate-500">Status: <span className="capitalize">{user.verification_status}</span></p>
        </div>
      </div>
      {user.verification_status === 'none' && (
        <button 
          onClick={onVerify}
          className="text-xs font-bold text-blue-600 hover:text-blue-700 underline"
        >
          Verify Now
        </button>
      )}
    </div>
  </div>
);

const Navbar = ({ user, onLogout, onNavigate }: { user: UserType | null, onLogout: () => void, onNavigate: (page: string) => void }) => (
  <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between h-16 items-center">
        <div className="flex items-center cursor-pointer" onClick={() => onNavigate('home')}>
          <div className="bg-emerald-500 p-2 rounded-lg mr-2">
            <Heart className="text-white w-6 h-6" />
          </div>
          <span className="text-2xl font-display font-bold text-slate-900">FoodShare</span>
        </div>
        
        <div className="flex items-center space-x-4">
          {user ? (
            <>
              <div className="hidden md:flex items-center space-x-6 mr-4">
                <button onClick={() => onNavigate('dashboard')} className="text-slate-600 hover:text-emerald-600 font-medium transition-colors">Dashboard</button>
                <button onClick={() => onNavigate('history')} className="text-slate-600 hover:text-emerald-600 font-medium transition-colors">History</button>
                {user.role === 'admin' && (
                  <button onClick={() => onNavigate('admin')} className="text-slate-600 hover:text-emerald-600 font-medium transition-colors">Admin</button>
                )}
              </div>
              <div className="flex items-center space-x-2 bg-slate-100 px-3 py-1.5 rounded-full">
                <User className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-700 flex items-center">
                  {user.name}
                  {user.is_verified && <VerifiedBadge className="w-3 h-3 ml-1" />}
                </span>
                <span className="text-[10px] uppercase tracking-wider bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">{user.role}</span>
              </div>
              <button 
                onClick={onLogout}
                className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </>
          ) : (
            <div className="space-x-2">
              <button onClick={() => onNavigate('login')} className="px-4 py-2 text-slate-600 font-medium hover:text-emerald-600 transition-colors">Login</button>
              <button onClick={() => onNavigate('register')} className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-shadow shadow-sm">Join Now</button>
            </div>
          )}
        </div>
      </div>
    </div>
  </nav>
);

interface FoodCardProps {
  listing: Listing;
  onAction?: (l: Listing) => void;
  actionLabel?: string;
  actionIcon?: any;
  showStatus?: boolean;
  key?: React.Key;
}

const FoodCard = ({ listing, onAction, actionLabel, actionIcon: Icon, showStatus = false }: FoodCardProps) => (
  <motion.div 
    layout
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
  >
    <div className="h-48 bg-slate-200 relative">
      <img 
        src={listing.image_url || `https://picsum.photos/seed/${listing.food_type}/400/300`} 
        alt={listing.food_type}
        className="w-full h-full object-cover"
        referrerPolicy="no-referrer"
      />
      {showStatus && (
        <div className={`absolute top-3 right-3 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
          listing.status === 'available' ? 'bg-emerald-500 text-white' : 
          listing.status === 'requested' ? 'bg-amber-500 text-white' : 'bg-slate-500 text-white'
        }`}>
          {listing.status}
        </div>
      )}
    </div>
    <div className="p-5">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-bold text-slate-900">{listing.food_type}</h3>
        <div className="text-right">
          <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full block">
            {listing.remaining_quantity} {listing.unit} left
          </span>
          <span className="text-[10px] text-slate-400 mt-1 block">of {listing.quantity}</span>
        </div>
      </div>
      
      <div className="space-y-2 mb-4">
        <div className="flex items-center text-slate-500 text-sm">
          <MapPin className="w-4 h-4 mr-2 text-slate-400" />
          {listing.location}
        </div>
        <div className="flex items-center text-slate-500 text-sm">
          <Clock className="w-4 h-4 mr-2 text-slate-400" />
          Expires: {listing.expiry_time}
        </div>
        {listing.donor_name && (
          <div className="flex items-center text-slate-500 text-sm">
            <User className="w-4 h-4 mr-2 text-slate-400" />
            <span className="flex items-center">
              Donor: {listing.donor_name}
              {listing.donor_verified && <VerifiedBadge className="w-3 h-3 ml-1" />}
            </span>
          </div>
        )}
      </div>

      {onAction && listing.status === 'available' && (
        <button 
          onClick={() => onAction(listing)}
          className="w-full flex items-center justify-center px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors group"
        >
          {Icon && <Icon className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />}
          {actionLabel}
        </button>
      )}
    </div>
  </motion.div>
);

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<UserType | null>(null);
  const [page, setPage] = useState('home');
  const [listings, setListings] = useState<Listing[]>([]);
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [myRequests, setMyRequests] = useState<RequestType[]>([]);
  const [donorRequests, setDonorRequests] = useState<RequestType[]>([]);
  const [adminStats, setAdminStats] = useState<any>(null);
  const [adminUsers, setAdminUsers] = useState<UserType[]>([]);
  const [adminListings, setAdminListings] = useState<Listing[]>([]);
  
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [envWarning, setEnvWarning] = useState<string | null>(null);
  const [isPickupModalOpen, setIsPickupModalOpen] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [pickupTimeInput, setPickupTimeInput] = useState('');
  const [requestedQuantityInput, setRequestedQuantityInput] = useState('');
  const [verificationIdUrl, setVerificationIdUrl] = useState('');
  const [capturedIdImage, setCapturedIdImage] = useState<string | null>(null);
  const [capturedSelfieImage, setCapturedSelfieImage] = useState<string | null>(null);
  const [isVerifyingAI, setIsVerifyingAI] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  
  // Form states
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '', role: 'receiver' as any, location: '' });
  const [listingForm, setListingForm] = useState({ food_type: '', quantity: 0, unit: 'Units', expiry_time: '', location: '', lat: 6.9271, lng: 79.8612, image_url: '' });
  const [searchQuery, setSearchQuery] = useState({ type: '', location: '' });

  useEffect(() => {
    // Check if the server detects the dummy API key
    fetch('/api/debug-env')
      .then(res => res.json())
      .then(data => {
        if (data.starts === 'MY_GE' && data.length === 17) {
          setEnvWarning("⚙️ Info: Real-time AI Match is currently disabled (No API Key). You can still proceed by capturing your photos; your request will be queued for manual review by our administrators instead of instant AI approval.");
        }
      })
      .catch(e => console.error("Could not check env:", e));
  }, []);

  useEffect(() => {
    fetchListings();
    const savedUser = localStorage.getItem('foodshare_user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      setUser(parsed);
      setPage('dashboard');
    }
  }, []);

  useEffect(() => {
    if (user) {
      if (user.role === 'donor') {
        fetchDonorData();
      } else if (user.role === 'receiver') {
        fetchReceiverData();
      } else if (user.role === 'admin') {
        fetchAdminData();
      }
    }
  }, [user]);

  const fetchListings = async () => {
    const params = new URLSearchParams(searchQuery);
    const res = await fetch(`/api/listings?status=available&${params.toString()}`);
    const data = await res.json();
    setListings(data);
  };

  const fetchDonorData = async () => {
    if (!user) return;
    const resListings = await fetch(`/api/listings`);
    const allListings = await resListings.json();
    setMyListings(allListings.filter((l: Listing) => l.donor_id === user.id));
    
    const resRequests = await fetch(`/api/requests/donor/${user.id}`);
    setDonorRequests(await resRequests.json());
  };

  const fetchReceiverData = async () => {
    if (!user) return;
    const resRequests = await fetch(`/api/requests/receiver/${user.id}`);
    setMyRequests(await resRequests.json());
  };

  const fetchAdminData = async () => {
    const resStats = await fetch('/api/admin/stats');
    setAdminStats(await resStats.json());
    const resUsers = await fetch('/api/admin/users');
    setAdminUsers(await resUsers.json());
    const resListings = await fetch('/api/listings');
    setAdminListings(await resListings.json());
  };

  const handleAdminDeleteUser = async (userId: number) => {
    if (confirm('Are you sure? This will permanently delete the user and all their listings/requests.')) {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchAdminData();
      }
    }
  };

  const handleAdminDeleteListing = async (listingId: number) => {
    if (confirm('Are you sure you want to delete this listing?')) {
      const res = await fetch(`/api/listings/${listingId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchAdminData();
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Attempting login with:", authForm.email);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authForm.email, password: authForm.password })
      });
      
      const data = await res.json();
      console.log("Login response status:", res.status);
      console.log("Login response data:", data);

      if (res.ok) {
        setUser(data);
        localStorage.setItem('foodshare_user', JSON.stringify(data));
        setPage('dashboard');
      } else {
        alert(`Login failed: ${data.error || 'Invalid credentials'}`);
      }
    } catch (err) {
      console.error("Login request failed:", err);
      alert('Network error. Please try again.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(authForm)
    });
    if (res.ok) {
      const data = await res.json();
      setUser(data);
      localStorage.setItem('foodshare_user', JSON.stringify(data));
      setPage('dashboard');
    } else {
      alert('Registration failed');
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('foodshare_user');
    setPage('home');
  };

  const handlePostListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (user.verification_status !== 'verified') {
      alert('Security Notice: You must verify your identity before posting food surplus. Please use the "Verify Now" option on your dashboard.');
      setIsVerificationModalOpen(true);
      return;
    }
    
    // Add some random jitter if coordinates are default to avoid overlap in demo
    const finalLat = listingForm.lat + (Math.random() - 0.5) * 0.01;
    const finalLng = listingForm.lng + (Math.random() - 0.5) * 0.01;

    const res = await fetch('/api/listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        ...listingForm, 
        lat: finalLat, 
        lng: finalLng, 
        donor_id: user.id,
        remaining_quantity: listingForm.quantity 
      })
    });
    if (res.ok) {
      setListingForm({ food_type: '', quantity: 0, unit: 'Units', expiry_time: '', location: '', lat: 6.9271, lng: 79.8612, image_url: '' });
      fetchDonorData();
      fetchListings();
      alert('Listing posted!');
    }
  };

  const handleRequestFood = (listing: Listing) => {
    console.log("handleRequestFood triggered for listing:", listing);
    if (!user) {
      console.log("No user logged in, redirecting to login");
      setPage('login');
      return;
    }
    
    if (user.verification_status !== 'verified') {
      alert('Security Notice: For the safety of our Colombo & Gampaha community, you must verify your identity before requesting food. Please use the "Verify Now" option on your dashboard.');
      setIsVerificationModalOpen(true);
      return;
    }

    console.log("Current user:", user);
    if (user.role !== 'receiver') {
      console.log("User is not a receiver, role:", user.role);
      alert('Only receivers can request food.');
      return;
    }

    setSelectedListing(listing);
    setPickupTimeInput('');
    setIsPickupModalOpen(true);
  };

  const submitPickupRequest = async () => {
    if (!selectedListing || !user || !pickupTimeInput) return;

    console.log("Submitting request with pickup_time:", pickupTimeInput);
    const payload = { 
      listing_id: Number(selectedListing.id), 
      receiver_id: Number(user.id), 
      pickup_time: pickupTimeInput,
      requested_quantity: requestedQuantityInput
    };
    console.log("Request Payload:", payload);

    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      console.log("Response from /api/requests:", data);
      
      if (res.ok) {
        setIsPickupModalOpen(false);
        setSelectedListing(null);
        setRequestedQuantityInput('');
        fetchListings();
        fetchReceiverData();
        alert('Request submitted successfully!');
      } else {
        alert(`Error: ${data.error || 'Failed to submit request'}`);
      }
    } catch (err) {
      console.error("Request failed with exception:", err);
      alert('Network error. Please try again.');
    }
  };

  const handleConfirmRequest = async (requestId: number) => {
    const res = await fetch(`/api/requests/${requestId}/confirm`, { method: 'PUT' });
    if (res.ok) fetchDonorData();
  };

  const handleCollectFood = async (requestId: number) => {
    const res = await fetch(`/api/requests/${requestId}/collect`, { method: 'PUT' });
    if (res.ok) {
      fetchDonorData();
      fetchReceiverData();
      alert('Food marked as collected!');
    }
  };

  const handleRequestVerification = async () => {
    if (!user || !verificationIdUrl) return;
    const res = await fetch(`/api/users/${user.id}/request-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_url: verificationIdUrl })
    });
    if (res.ok) {
      const updatedUser = await res.json();
      setUser(updatedUser);
      localStorage.setItem('foodshare_user', JSON.stringify(updatedUser));
      setIsVerificationModalOpen(false);
      alert('Verification request submitted for admin review.');
    }
  };

  const handleAdminVerifyUser = async (userId: number, status: 'verified' | 'rejected') => {
    const res = await fetch(`/api/admin/users/${userId}/verify`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (res.ok) {
      fetchAdminData();
    }
  };

  const handleAIDetection = async () => {
    if (!capturedIdImage || !capturedSelfieImage) return;
    
    setIsVerifyingAI(true);
    setVerificationError(null);
    
    try {
      const response = await fetch('/api/verify-identity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idImage: capturedIdImage,
          selfieImage: capturedSelfieImage
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.details || errData.error || 'Identity verification failed at server');
      }

      const result = await response.json();
      console.log("AI Verification Result:", result);

      if (result.isMatch && result.isLive && result.confidenceScore > 0.6) {
        // Success! Submit to server for status update
        const res = await fetch(`/api/users/${user?.id}/request-verification`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            id_url: capturedIdImage,
            face_url: capturedSelfieImage,
            ai_reason: result.reason
          }) 
        });
        
        const contentType = res.headers.get("content-type");
        if (res.ok && contentType && contentType.includes("application/json")) {
          const updatedUser = await res.json();
          setUser(updatedUser);
          localStorage.setItem('foodshare_user', JSON.stringify(updatedUser));
          setIsVerificationModalOpen(false);
          setCapturedIdImage(null);
          setCapturedSelfieImage(null);
          alert('AI Verification Successful! Your profile is now pending final admin approval.');
        } else {
          const errorText = await res.text();
          console.error("Server verification error:", errorText);
          setVerificationError("Server error occurred during verification. Please try again.");
        }
      } else {
        setVerificationError(result.reason || "AI could not verify identity. Please ensure both photos are clear and show the same person.");
      }
    } catch (err: any) {
      console.error("AI Verification failed:", err);
      setVerificationError(err.message || "Verification service temporarily unavailable. Please try again later.");
    } finally {
      setIsVerifyingAI(false);
    }
  };

  const handleDeleteListing = async (id: number) => {
    if (confirm('Are you sure you want to delete this listing?')) {
      const res = await fetch(`/api/listings/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchDonorData();
        fetchListings();
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} onLogout={handleLogout} onNavigate={setPage} />

      {/* Verification Modal */}
      <AnimatePresence>
        {isVerificationModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl border border-slate-200 overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-blue-100 rounded-2xl text-blue-600">
                  <Fingerprint className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-display font-bold text-slate-900">AI Identity Verification</h3>
              </div>
              
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl mb-8 flex gap-3">
                <div className="shrink-0 text-blue-500">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <p className="text-xs text-blue-700 leading-relaxed font-medium">
                  To ensure the safety of our Colombo & Gampaha community, we use secure AI to verify that the person donating or receiving food matches their identification.
                </p>
              </div>
              
              <div className="space-y-6">
                {envWarning && (
                  <div className="bg-slate-50 border-2 border-slate-200 text-slate-700 p-4 rounded-2xl text-[11px] font-medium shadow-sm flex gap-3 items-start">
                    <History className="w-5 h-5 shrink-0 mt-0.5 text-slate-500" />
                    <div className="leading-relaxed">{envWarning}</div>
                  </div>
                )}
                
                <CameraSection 
                  label="1. Position Your ID (NIC/Passport)" 
                  capturedImage={capturedIdImage}
                  onCapture={setCapturedIdImage}
                />
                
                <CameraSection 
                  label="2. Take a Live Selfie" 
                  capturedImage={capturedSelfieImage}
                  onCapture={setCapturedSelfieImage}
                />

                {verificationError && (
                  <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex gap-3 items-center text-rose-600">
                    <ShieldAlert className="w-5 h-5 shrink-0" />
                    <p className="text-sm font-semibold">{verificationError}</p>
                  </div>
                )}
                
                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => {
                      setIsVerificationModalOpen(false);
                      setCapturedIdImage(null);
                      setCapturedSelfieImage(null);
                      setVerificationError(null);
                    }}
                    className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleAIDetection}
                    disabled={!capturedIdImage || !capturedSelfieImage || isVerifyingAI}
                    className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {isVerifyingAI ? (
                      <>
                        <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : 'Verify Identity'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Pickup Time Modal */}
      <AnimatePresence>
        {isPickupModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-200"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-emerald-100 rounded-2xl text-emerald-600">
                  <Clock className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-display font-bold text-slate-900">Schedule Pickup</h3>
              </div>
              
              <p className="text-slate-600 mb-6">
                Please specify when you'd like to pick up the <span className="font-bold text-slate-900">{selectedListing?.food_type}</span>.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Quantity to Request</label>
                  <div className="relative">
                    <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="number" 
                      min="0.1"
                      step="0.1"
                      max={selectedListing?.remaining_quantity}
                      placeholder={`Available: ${selectedListing?.remaining_quantity} ${selectedListing?.unit}`}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      value={requestedQuantityInput}
                      onChange={(e) => setRequestedQuantityInput(e.target.value)}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 italic">Maximum: {selectedListing?.remaining_quantity} {selectedListing?.unit}</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Preferred Pickup Time</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="e.g., Today at 6:00 PM"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      value={pickupTimeInput}
                      onChange={(e) => setPickupTimeInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && submitPickupRequest()}
                    />
                  </div>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => setIsPickupModalOpen(false)}
                    className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={submitPickupRequest}
                    disabled={!pickupTimeInput.trim()}
                    className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Confirm Request
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main className="flex-grow">
        <AnimatePresence mode="wait">
          {page === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-7xl mx-auto px-4 py-12"
            >
              <div className="text-center mb-16">
                <motion.h1 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="text-5xl md:text-7xl font-display font-black text-slate-900 mb-6 tracking-tight"
                >
                  Share Food, <span className="text-emerald-600">Spread Love.</span>
                </motion.h1>
                <motion.p 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="text-xl text-slate-600 max-w-2xl mx-auto mb-10"
                >
                  Join our community to reduce food waste and help those in need. 
                  Donors list surplus food, and receivers can easily claim it.
                </motion.p>
                <div className="flex flex-wrap justify-center gap-4">
                  <button 
                    onClick={() => setPage('register')}
                    className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-emerald-200 hover:bg-emerald-700 hover:-translate-y-1 transition-all"
                  >
                    Start Donating
                  </button>
                  <button 
                    onClick={() => {
                      const el = document.getElementById('listings');
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="px-8 py-4 bg-white text-slate-900 border border-slate-200 rounded-2xl font-bold text-lg hover:bg-slate-50 transition-all"
                  >
                    Browse Food
                  </button>
                </div>
              </div>

              <div id="listings" className="scroll-mt-24">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                  <h2 className="text-3xl font-display font-bold text-slate-900">Available Surplus Food</h2>
                  <div className="flex flex-wrap gap-2">
                    <div className="flex bg-slate-100 p-1 rounded-xl mr-2">
                      <button 
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded-lg flex items-center gap-2 text-sm font-bold transition-all ${viewMode === 'grid' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        <LayoutGrid className="w-4 h-4" />
                        Grid
                      </button>
                      <button 
                        onClick={() => setViewMode('map')}
                        className={`p-2 rounded-lg flex items-center gap-2 text-sm font-bold transition-all ${viewMode === 'map' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        <MapIcon className="w-4 h-4" />
                        Map
                      </button>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Search location (e.g. Colombo, Gampaha)..." 
                        className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                        value={searchQuery.location}
                        onChange={(e) => setSearchQuery({ ...searchQuery, location: e.target.value })}
                        onKeyUp={(e) => e.key === 'Enter' && fetchListings()}
                      />
                    </div>
                    <button 
                      onClick={fetchListings}
                      className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors"
                    >
                      <Filter className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {viewMode === 'map' ? (
                  <MapView listings={listings} onAction={handleRequestFood} />
                ) : listings.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {listings.map(listing => (
                      <FoodCard 
                        key={listing.id} 
                        listing={listing} 
                        onAction={handleRequestFood} 
                        actionLabel="Request Pickup"
                        actionIcon={Plus}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
                    <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">No food listings found matching your criteria.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {page === 'login' && (
            <motion.div 
              key="login"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-md mx-auto mt-20 px-4"
            >
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl">
                <h2 className="text-3xl font-display font-bold text-slate-900 mb-6 text-center">Admin Access</h2>
                <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-emerald-800 leading-relaxed">
                    Test the new Admin features! You can login with:<br/>
                    <strong>Email:</strong> admin@test.com<br/>
                    <strong>Password:</strong> password123
                  </p>
                </div>
                <h2 className="text-2xl font-display font-bold text-slate-900 mb-6 text-center mt-6">Welcome Back</h2>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Email Address</label>
                    <input 
                      type="email" 
                      required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      value={authForm.email}
                      onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Password</label>
                    <input 
                      type="password" 
                      required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      value={authForm.password}
                      onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                    />
                  </div>
                  <button 
                    type="submit"
                    className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors mt-4"
                  >
                    Login to Account
                  </button>
                </form>
                <p className="mt-6 text-center text-slate-500">
                  Don't have an account? <button onClick={() => setPage('register')} className="text-emerald-600 font-bold">Register</button>
                </p>
              </div>
            </motion.div>
          )}

          {page === 'register' && (
            <motion.div 
              key="register"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-md mx-auto mt-12 px-4"
            >
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl">
                <h2 className="text-3xl font-display font-bold text-slate-900 mb-6 text-center">Create Account</h2>
                
                <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-2xl flex gap-3">
                  <Fingerprint className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-blue-700 leading-normal">
                    <strong>Colombo & Gampaha Safety Initiative:</strong> All users are required to complete AI-driven face and ID verification before posting or requesting food.
                  </p>
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name</label>
                    <input 
                      type="text" 
                      required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      value={authForm.name}
                      onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Email Address</label>
                    <input 
                      type="email" 
                      required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      value={authForm.email}
                      onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Password</label>
                    <input 
                      type="password" 
                      required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      value={authForm.password}
                      onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">I am a...</label>
                    <select 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      value={authForm.role}
                      onChange={(e) => setAuthForm({ ...authForm, role: e.target.value as any })}
                    >
                      <option value="receiver">Receiver (Need Food)</option>
                      <option value="donor">Donor (Have Surplus Food)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Location</label>
                    <input 
                      type="text" 
                      placeholder="City, Area"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      value={authForm.location}
                      onChange={(e) => setAuthForm({ ...authForm, location: e.target.value })}
                    />
                  </div>
                  <button 
                    type="submit"
                    className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors mt-4"
                  >
                    Register Now
                  </button>
                </form>
                <p className="mt-6 text-center text-slate-500">
                  Already have an account? <button onClick={() => setPage('login')} className="text-emerald-600 font-bold">Login</button>
                </p>
              </div>
            </motion.div>
          )}

          {page === 'dashboard' && user && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="max-w-7xl mx-auto px-4 py-12"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                <div>
                  <h1 className="text-4xl font-display font-bold text-slate-900">Welcome, {user.name}</h1>
                  <p className="text-slate-500">Manage your food sharing activities here.</p>
                </div>
                {user.role === 'donor' && (
                  <button 
                    onClick={() => {
                      const el = document.getElementById('post-form');
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="flex items-center px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Post New Listing
                  </button>
                )}
              </div>

              {user.role === 'donor' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                  <div className="lg:col-span-2 space-y-10">
                    <section>
                      <h2 className="text-2xl font-display font-bold text-slate-900 mb-6 flex items-center">
                        <History className="w-6 h-6 mr-2 text-emerald-500" />
                        My Active Listings
                      </h2>
                      {myListings.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {myListings.map(listing => (
                            <div key={listing.id} className="relative group">
                              <FoodCard listing={listing} showStatus />
                              <div className="absolute top-3 left-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => handleDeleteListing(listing.id)}
                                  className="p-2 bg-rose-500 text-white rounded-lg shadow-lg hover:bg-rose-600"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-300">
                          <p className="text-slate-500">You haven't posted any food yet.</p>
                        </div>
                      )}
                    </section>

                    <section>
                      <h2 className="text-2xl font-display font-bold text-slate-900 mb-6 flex items-center">
                        <AlertCircle className="w-6 h-6 mr-2 text-amber-500" />
                        Incoming Requests
                      </h2>
                      <div className="space-y-4">
                        {donorRequests.filter(r => r.status !== 'collected').length > 0 ? (
                          donorRequests.filter(r => r.status !== 'collected').map(request => (
                            <div key={request.id} className="bg-white p-6 rounded-2xl border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                              <div>
                                <h4 className="font-bold text-slate-900 text-lg flex items-center">
                                  {request.food_type}
                                  {request.status === 'confirmed' && <CheckCircle2 className="w-4 h-4 ml-2 text-emerald-500" />}
                                </h4>
                                <p className="text-sm text-slate-500 flex items-center">
                                  Requested by: 
                                  <span className="font-semibold text-slate-700 ml-1 flex items-center">
                                    {request.receiver_name}
                                    {request.receiver_verified && <VerifiedBadge className="w-3 h-3 ml-1" />}
                                  </span>
                                </p>
                                {request.requested_quantity && (
                                  <p className="text-sm font-bold text-emerald-700 flex items-center mt-1">
                                    <Package className="w-3 h-3 mr-1" />
                                    Requested: {request.requested_quantity}
                                  </p>
                                )}
                                <p className="text-sm text-slate-500 flex items-center mt-1">
                                  <Clock className="w-3 h-3 mr-1" />
                                  Pickup: {request.pickup_time}
                                </p>
                              </div>
                              <div className="flex gap-2 w-full md:w-auto">
                                {request.status === 'pending' && (
                                  <button 
                                    onClick={() => handleConfirmRequest(request.id)}
                                    className="flex-1 md:flex-none px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors"
                                  >
                                    Confirm
                                  </button>
                                )}
                                {request.status === 'confirmed' && (
                                  <button 
                                    onClick={() => handleCollectFood(request.id)}
                                    className="flex-1 md:flex-none px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
                                  >
                                    Mark Collected
                                  </button>
                                )}
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                  request.status === 'confirmed' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                                }`}>
                                  {request.status}
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-slate-500 italic">No pending requests at the moment.</p>
                        )}
                      </div>
                    </section>
                  </div>

                  <div id="post-form" className="lg:col-span-1">
                    <ProfileStatusCard user={user} onVerify={() => setIsVerificationModalOpen(true)} />

                    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-lg sticky top-24">
                      <h2 className="text-2xl font-display font-bold text-slate-900 mb-6">Post Food Surplus</h2>
                      <form onSubmit={handlePostListing} className="space-y-4">
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1">Food Type</label>
                          <input 
                            type="text" 
                            placeholder="e.g., Fresh Bread, Vegetable Mix"
                            required
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                            value={listingForm.food_type}
                            onChange={(e) => setListingForm({ ...listingForm, food_type: e.target.value })}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Amount</label>
                            <input 
                              type="number" 
                              placeholder="e.g., 10"
                              required
                              min="0.1"
                              step="0.1"
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                              value={listingForm.quantity}
                              onChange={(e) => setListingForm({ ...listingForm, quantity: parseFloat(e.target.value) || 0 })}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Unit</label>
                            <select 
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                              value={listingForm.unit}
                              onChange={(e) => setListingForm({ ...listingForm, unit: e.target.value })}
                            >
                              <option value="Units">Units/Packs</option>
                              <option value="KG">KG</option>
                              <option value="Liters">Liters</option>
                              <option value="Boxes">Boxes</option>
                              <option value="Portions">Portions</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1">Expiry / Best Before</label>
                          <input 
                            type="text" 
                            placeholder="e.g., Today 9 PM, 2 Days"
                            required
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                            value={listingForm.expiry_time}
                            onChange={(e) => setListingForm({ ...listingForm, expiry_time: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1">Pickup Location</label>
                          <input 
                            type="text" 
                            placeholder="Full address or area"
                            required
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                            value={listingForm.location}
                            onChange={(e) => setListingForm({ ...listingForm, location: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1">Image URL (Optional)</label>
                          <input 
                            type="text" 
                            placeholder="https://..."
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                            value={listingForm.image_url}
                            onChange={(e) => setListingForm({ ...listingForm, image_url: e.target.value })}
                          />
                        </div>
                        <button 
                          type="submit"
                          className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors mt-4"
                        >
                          Publish Listing
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              )}

              {user.role === 'receiver' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                  <div className="lg:col-span-2 space-y-12">
                    <section>
                      <div className="flex items-center justify-between mb-8">
                        <h2 className="text-3xl font-display font-bold text-slate-900">Available Food Near You</h2>
                        <button onClick={() => setPage('home')} className="text-emerald-600 font-bold flex items-center hover:underline">
                          Browse All <ChevronRight className="w-4 h-4 ml-1" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-6">
                        {listings.slice(0, 4).map(listing => (
                          <FoodCard 
                            key={listing.id} 
                            listing={listing} 
                            onAction={handleRequestFood} 
                            actionLabel="Request Pickup"
                            actionIcon={Plus}
                          />
                        ))}
                      </div>
                    </section>

                    <section>
                      <h2 className="text-2xl font-display font-bold text-slate-900 mb-8 flex items-center">
                        <History className="w-8 h-8 mr-3 text-emerald-500" />
                        My Active Requests
                      </h2>
                      <div className="grid grid-cols-1 md:grid-cols-1 xl:grid-cols-2 gap-6">
                        {myRequests.filter(r => r.status !== 'collected').length > 0 ? (
                          myRequests.filter(r => r.status !== 'collected').map(request => (
                            <div key={request.id} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
                              <div>
                                <div className="flex justify-between items-start mb-4">
                                  <h4 className="text-xl font-bold text-slate-900">{request.food_type}</h4>
                                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                    request.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : 
                                    request.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'
                                  }`}>
                                    {request.status}
                                  </span>
                                </div>
                                <div className="space-y-3 mb-6">
                                  <div className="flex items-center text-slate-600">
                                    <User className="w-4 h-4 mr-2 text-slate-400" />
                                    Donor: {request.donor_name}
                                  </div>
                                  <div className="flex items-center text-slate-600">
                                    <MapPin className="w-4 h-4 mr-2 text-slate-400" />
                                    {request.location}
                                  </div>
                                  {request.requested_quantity && (
                                    <div className="flex items-center text-emerald-700 font-bold">
                                      <Package className="w-4 h-4 mr-2 text-emerald-500" />
                                      Your Requested Qty: {request.requested_quantity}
                                    </div>
                                  )}
                                  <div className="flex items-center text-slate-600">
                                    <Clock className="w-4 h-4 mr-2 text-slate-400" />
                                    Pickup: {request.pickup_time}
                                  </div>
                                </div>
                              </div>
                              {request.status === 'confirmed' && (
                                <button 
                                  onClick={() => handleCollectFood(request.id)}
                                  className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center"
                                >
                                  <CheckCircle2 className="w-5 h-5 mr-2" />
                                  Confirm Collection
                                </button>
                              )}
                              {request.status === 'pending' && (
                                <div className="p-4 bg-amber-50 rounded-2xl flex items-start">
                                  <AlertCircle className="w-5 h-5 text-amber-500 mr-3 flex-shrink-0 mt-0.5" />
                                  <p className="text-sm text-amber-800">Waiting for donor to confirm your pickup request.</p>
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="md:col-span-2 text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300">
                            <p className="text-slate-500">You haven't made any requests yet.</p>
                          </div>
                        )}
                      </div>
                    </section>
                  </div>

                  <div className="lg:col-span-1">
                    <ProfileStatusCard user={user} onVerify={() => setIsVerificationModalOpen(true)} />
                    
                    <div className="bg-emerald-50 p-8 rounded-3xl border border-emerald-100 shadow-sm">
                      <h3 className="text-xl font-display font-bold text-emerald-900 mb-4">Receiver Benefits</h3>
                      <ul className="space-y-3 text-emerald-800 text-sm">
                        <li className="flex items-start">
                          <CheckCircle2 className="w-4 h-4 mr-2 mt-0.5 text-emerald-500" />
                          Access to surplus food from verified donors.
                        </li>
                        <li className="flex items-start">
                          <CheckCircle2 className="w-4 h-4 mr-2 mt-0.5 text-emerald-500" />
                          Priority verification support.
                        </li>
                        <li className="flex items-start">
                          <CheckCircle2 className="w-4 h-4 mr-2 mt-0.5 text-emerald-500" />
                          Safe and secure pickup locations.
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {page === 'history' && user && (
            <motion.div 
              key="history"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="max-w-7xl mx-auto px-4 py-12"
            >
              <h1 className="text-4xl font-display font-bold text-slate-900 mb-10">Donation History</h1>
              
              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-wider">Food Item</th>
                      <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-wider">Partner</th>
                      <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {user.role === 'donor' ? (
                      donorRequests.filter(r => r.status === 'collected').map(r => (
                        <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-medium text-slate-900">{r.food_type}</td>
                          <td className="px-6 py-4 text-slate-600">{r.receiver_name}</td>
                          <td className="px-6 py-4 text-slate-500 text-sm">{new Date(r.created_at).toLocaleDateString()}</td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md text-[10px] font-bold uppercase tracking-wider">Collected</span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      myRequests.filter(r => r.status === 'collected').map(r => (
                        <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-medium text-slate-900">{r.food_type}</td>
                          <td className="px-6 py-4 text-slate-600">{r.donor_name}</td>
                          <td className="px-6 py-4 text-slate-500 text-sm">{new Date(r.created_at).toLocaleDateString()}</td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md text-[10px] font-bold uppercase tracking-wider">Collected</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                {((user.role === 'donor' && donorRequests.filter(r => r.status === 'collected').length === 0) || 
                  (user.role === 'receiver' && myRequests.filter(r => r.status === 'collected').length === 0)) && (
                  <div className="p-12 text-center text-slate-500">No completed donations found.</div>
                )}
              </div>
            </motion.div>
          )}

          {page === 'admin' && user?.role === 'admin' && (
            <motion.div 
              key="admin"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="max-w-7xl mx-auto px-4 py-12"
            >
              <h1 className="text-4xl font-display font-bold text-slate-900 mb-10 flex items-center">
                <ShieldCheck className="w-10 h-10 mr-4 text-emerald-600" />
                Admin Control Panel
              </h1>

              {adminStats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                  <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <User className="w-12 h-12" />
                    </div>
                    <p className="text-slate-500 font-medium mb-1">Total Users</p>
                    <p className="text-4xl font-display font-black text-slate-900">{adminStats.users}</p>
                  </div>
                  <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <LayoutGrid className="w-12 h-12" />
                    </div>
                    <p className="text-slate-500 font-medium mb-1">Total Listings</p>
                    <p className="text-4xl font-display font-black text-slate-900">{adminStats.listings}</p>
                  </div>
                  <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <CheckCircle2 className="w-12 h-12" />
                    </div>
                    <p className="text-slate-500 font-medium mb-1">Impact</p>
                    <p className="text-4xl font-display font-black text-emerald-600">{adminStats.collected}</p>
                  </div>
                  <div className={`p-8 rounded-3xl border shadow-sm relative overflow-hidden group transition-all ${
                    adminStats.pendingVerifications > 0 ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200'
                  }`}>
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <ShieldCheck className="w-12 h-12" />
                    </div>
                    <p className="text-slate-500 font-medium mb-1">Pending Verifications</p>
                    <p className={`text-4xl font-display font-black ${
                      adminStats.pendingVerifications > 0 ? 'text-blue-600' : 'text-slate-900'
                    }`}>{adminStats.pendingVerifications}</p>
                  </div>
                </div>
              )}

              <div className="space-y-12">
                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-900">Pending Identity Verifications</h3>
                  </div>
                  {adminUsers.filter(u => u.verification_status === 'pending').length === 0 ? (
                    <div className="p-8 text-center text-slate-500">No pending verifications to review.</div>
                  ) : (
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {adminUsers.filter(u => u.verification_status === 'pending').map(u => (
                        <div key={`pending-${u.id}`} className="bg-white border text-center border-amber-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
                          <div className="bg-amber-50 p-4 border-b border-amber-100 flex items-center justify-between">
                            <span className="font-bold text-slate-800">{u.name}</span>
                            <span className="uppercase tracking-wider text-[10px] font-bold bg-amber-200 text-amber-800 px-2 py-1 rounded-full">{u.role}</span>
                          </div>
                          <div className="p-4 grow flex flex-col items-center bg-slate-50">
                            <div className="grid grid-cols-2 gap-2 mb-4 w-full">
                              <div className="space-y-1 text-center">
                                <span className="text-[10px] uppercase font-bold text-slate-400">ID Document</span>
                                {u.verification_id_url ? (
                                  <img src={u.verification_id_url} alt="ID Document" className="w-full h-32 object-cover rounded-lg border border-slate-200 shadow-sm" />
                                ) : (
                                  <div className="w-full h-32 bg-slate-200 rounded-lg flex items-center justify-center text-slate-400">No ID</div>
                                )}
                              </div>
                              <div className="space-y-1 text-center">
                                <span className="text-[10px] uppercase font-bold text-slate-400">Selfie Register</span>
                                {u.verification_face_url ? (
                                  <img src={u.verification_face_url} alt="Selfie" className="w-full h-32 object-cover rounded-lg border border-slate-200 shadow-sm" />
                                ) : (
                                  <div className="w-full h-32 bg-slate-200 rounded-lg flex items-center justify-center text-slate-400">No Selfie</div>
                                )}
                              </div>
                            </div>
                            <div className="mb-4 w-full">
                               <div className={`p-2 rounded-xl text-[10px] font-bold text-left ${
                                 u.verification_ai_reason === 'SIMULATED_SUCCESS_NO_API_KEY' 
                                 ? 'bg-rose-50 text-rose-700 border border-rose-100' 
                                 : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                               }`}>
                                 <span className="opacity-60 uppercase mb-0.5 block italic font-extrabold tracking-tighter">AI Result Analysis</span>
                                 {u.verification_ai_reason === 'SIMULATED_SUCCESS_NO_API_KEY' ? '⚠️ BYPASSED: No valid API Key. REQUIRES MANUAL REVIEW.' : u.verification_ai_reason || 'Face Match Confirmed'}
                               </div>
                            </div>
                            <div className="flex gap-2 w-full mt-auto">
                              <button 
                                onClick={() => handleAdminVerifyUser(u.id, 'verified')}
                                className="flex-1 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center"
                              >
                                <ShieldCheck className="w-4 h-4 mr-1" /> Approve
                              </button>
                              <button 
                                onClick={() => handleAdminVerifyUser(u.id, 'rejected')}
                                className="flex-1 py-2 bg-rose-100 text-rose-700 rounded-xl font-bold hover:bg-rose-200 transition-colors flex items-center justify-center"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-900">User Management</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-wider">User</th>
                          <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-wider">Verification</th>
                          <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-wider">ID Document</th>
                          <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {adminUsers.filter(u => u.role !== 'admin').map(u => (
                          <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-medium text-slate-900 flex items-center">
                                {u.name}
                                {u.is_verified === 1 && <VerifiedBadge className="w-3 h-3 ml-1" />}
                              </div>
                              <div className="text-xs text-slate-500">{u.email} • {u.role}</div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                u.verification_status === 'verified' ? 'bg-emerald-100 text-emerald-700' : 
                                u.verification_status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                              }`}>
                                {u.verification_status}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1">
                                {u.verification_id_url && (
                                  <a href={u.verification_id_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-emerald-600 hover:underline flex items-center font-bold">
                                    ID Image <ChevronRight className="w-2 h-2 ml-1" />
                                  </a>
                                )}
                                {u.verification_face_url && (
                                  <a href={u.verification_face_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:underline flex items-center font-bold">
                                    Selfie Image <ChevronRight className="w-2 h-2 ml-1" />
                                  </a>
                                )}
                                {!u.verification_id_url && !u.verification_face_url && <span className="text-xs text-slate-400 italic">No assets</span>}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {u.verification_status === 'pending' ? (
                                <div className="flex gap-2">
                                  <button 
                                    onClick={() => handleAdminVerifyUser(u.id, 'verified')}
                                    className="p-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors" title="Verify User"
                                  >
                                    <ShieldCheck className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => handleAdminVerifyUser(u.id, 'rejected')}
                                    className="p-2 bg-rose-100 text-rose-700 rounded-lg hover:bg-rose-200 transition-colors" title="Reject Verification"
                                  >
                                    <ShieldAlert className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => handleAdminDeleteUser(u.id)}
                                    className="p-2 ml-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" title="Delete User Completely"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <button 
                                  onClick={() => handleAdminDeleteUser(u.id)}
                                  className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" title="Delete User Completely"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-900">Food Listings Controls</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-wider">Item & Status</th>
                          <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-wider">Donor</th>
                          <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-wider">Location</th>
                          <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {adminListings.map(listing => (
                          <tr key={listing.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-medium text-slate-900">{listing.food_type}</div>
                              <span className={`inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                listing.status === 'available' ? 'bg-emerald-100 text-emerald-700' : 
                                listing.status === 'requested' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                              }`}>
                                {listing.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-slate-600 font-medium">
                              {listing.donor_name}
                            </td>
                            <td className="px-6 py-4 text-slate-500 text-sm">
                              {listing.location}
                            </td>
                            <td className="px-6 py-4 text-right">
                               <button 
                                  onClick={() => handleAdminDeleteListing(listing.id)}
                                  className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" title="Remove Listing"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="bg-slate-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center mb-6">
                <div className="bg-emerald-500 p-2 rounded-lg mr-2">
                  <Heart className="text-white w-6 h-6" />
                </div>
                <span className="text-2xl font-display font-bold">FoodShare</span>
              </div>
              <p className="text-slate-400 max-w-sm">
                Making food donation simple, structured, and accessible for everyone. 
                Together we can eliminate food waste and hunger.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-6 text-lg">Quick Links</h4>
              <ul className="space-y-4 text-slate-400">
                <li><button onClick={() => setPage('home')} className="hover:text-emerald-400 transition-colors">Browse Food</button></li>
                <li><button onClick={() => setPage('register')} className="hover:text-emerald-400 transition-colors">Donate Now</button></li>
                <li><button className="hover:text-emerald-400 transition-colors">About Us</button></li>
                <li><button className="hover:text-emerald-400 transition-colors">Contact</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-6 text-lg">Community</h4>
              <ul className="space-y-4 text-slate-400">
                <li><button className="hover:text-emerald-400 transition-colors">Success Stories</button></li>
                <li><button className="hover:text-emerald-400 transition-colors">Volunteer</button></li>
                <li><button className="hover:text-emerald-400 transition-colors">Partners</button></li>
                <li><button className="hover:text-emerald-400 transition-colors">FAQ</button></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-800 text-center text-slate-500 text-sm">
            © 2026 FoodShare Surplus Food Donation Platform. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
