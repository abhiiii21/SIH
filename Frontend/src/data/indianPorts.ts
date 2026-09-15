export interface IndianPort {
  name: string;
  city: string;
  lat: number;
  lng: number;
}

export const INDIAN_PORTS: IndianPort[] = [
  { name: "Jawaharlal Nehru Port (JNPT)", city: "Navi Mumbai, Maharashtra", lat: 18.9490, lng: 72.9525 },
  { name: "Mumbai Port", city: "Mumbai, Maharashtra", lat: 18.9220, lng: 72.8347 },
  { name: "Kandla / Deendayal Port", city: "Kandla, Gujarat", lat: 23.0333, lng: 70.2167 },
  { name: "Mundra Port", city: "Mundra, Gujarat", lat: 22.8394, lng: 69.7047 },
  { name: "Kolkata Port", city: "Kolkata, West Bengal", lat: 22.5497, lng: 88.3247 },
  { name: "Haldia Port", city: "Haldia, West Bengal", lat: 22.0333, lng: 88.0667 },
  { name: "Chennai Port", city: "Chennai, Tamil Nadu", lat: 13.0980, lng: 80.2930 },
  { name: "Ennore (Kamarajar) Port", city: "Chennai, Tamil Nadu", lat: 13.2333, lng: 80.3333 },
  { name: "V.O. Chidambaranar Port (Tuticorin)", city: "Thoothukudi, Tamil Nadu", lat: 8.7642, lng: 78.1348 },
  { name: "Visakhapatnam Port", city: "Visakhapatnam, Andhra Pradesh", lat: 17.6868, lng: 83.2185 },
  { name: "Paradip Port", city: "Paradip, Odisha", lat: 20.2650, lng: 86.6910 },
  { name: "Cochin Port", city: "Kochi, Kerala", lat: 9.9667, lng: 76.2667 },
  { name: "New Mangalore Port", city: "Mangaluru, Karnataka", lat: 12.9141, lng: 74.8560 },
];
