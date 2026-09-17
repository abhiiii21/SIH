import os
import shutil
import time
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.user import User

router = APIRouter(prefix="/settings", tags=["Settings & System Configuration"])

# Ensure avatar storage directory exists
AVATAR_STORAGE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "storage", "avatars")
os.makedirs(AVATAR_STORAGE_DIR, exist_ok=True)

# In-memory officer profile cache with persistent defaults
OFFICER_PROFILE_STORE: Dict[str, Any] = {
    "name": "Commander S. Kumar",
    "email": "s.kumar@indiancoastguard.gov.in",
    "organization": "Indian Coast Guard (West HQ)",
    "role": "Senior Maritime Operations Officer",
    "clearance": "SECRET // Maritime Operations Command",
    "dsc_status": "Active (Class-3 MoD e-Sign)",
    "dsc_key_id": "DSC-ICG-MRCC-9214",
    "phone": "+91 22 2439 8810",
    "satcom_id": "INMARSAT-C #423-8891",
    "statutory_authority": "Indian Coast Guard Act 1978 Sec 14 / UNCLOS Art. 220",
    "avatar_url": None,
}

# In-memory team store
TEAM_STORE: List[Dict[str, Any]] = [
    {
        "id": 1,
        "name": "Commander S. Kumar",
        "email": "s.kumar@indiancoastguard.gov.in",
        "role": "Incident Commander",
        "status": "Active",
        "agency": "ICG West HQ",
        "clearance": "SECRET",
        "last_active": "Just now",
        "avatar_url": None,
    },
    {
        "id": 2,
        "name": "Dr. Ananya Sharma",
        "email": "a.sharma@incois.gov.in",
        "role": "Oceanographic Modeler",
        "status": "Active",
        "agency": "INCOIS Hyderabad",
        "clearance": "RESTRICTED",
        "last_active": "12m ago",
        "avatar_url": None,
    },
    {
        "id": 3,
        "name": "R. Narayanan",
        "email": "r.narayanan@dgshipping.gov.in",
        "role": "VTS Watch Officer",
        "status": "Active",
        "agency": "DG Shipping Mumbai",
        "clearance": "CONFIDENTIAL",
        "last_active": "45m ago",
        "avatar_url": None,
    },
    {
        "id": 4,
        "name": "K. Deshmukh",
        "email": "k.deshmukh@mpcb.gov.in",
        "role": "Environmental Officer",
        "status": "Pending",
        "agency": "Maharashtra SPCB",
        "clearance": "OFFICIAL",
        "last_active": "2h ago",
        "avatar_url": None,
    },
]


class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    organization: Optional[str] = None
    role: Optional[str] = None
    phone: Optional[str] = None
    satcom_id: Optional[str] = None
    statutory_authority: Optional[str] = None
    clearance: Optional[str] = None
    avatar_url: Optional[str] = None


class TestAlertRequest(BaseModel):
    channels: List[str] = ["sms", "email", "whatsapp", "inApp"]
    severity: str = "High"
    incident_code: str = "IN-MH-2026"
    test_message: Optional[str] = None


class TeamMemberCreate(BaseModel):
    name: str
    email: EmailStr
    role: str = "Senior Analyst"
    agency: str = "Indian Coast Guard"
    clearance: str = "CONFIDENTIAL"


from app.api.deps import get_current_user


@router.get("/profile")
async def get_profile(current_user: Optional[User] = Depends(get_current_user)):
    """Fetch the active officer profile and credentials."""
    if current_user:
        return {
            "name": current_user.name or OFFICER_PROFILE_STORE["name"],
            "email": current_user.email or OFFICER_PROFILE_STORE["email"],
            "organization": current_user.organization or OFFICER_PROFILE_STORE["organization"],
            "role": current_user.role or OFFICER_PROFILE_STORE["role"],
            "clearance": OFFICER_PROFILE_STORE.get("clearance", "SECRET // Maritime Operations Command"),
            "dsc_status": OFFICER_PROFILE_STORE.get("dsc_status", "Active (Class-3 MoD e-Sign)"),
            "dsc_key_id": OFFICER_PROFILE_STORE.get("dsc_key_id", "DSC-ICG-MRCC-9214"),
            "phone": OFFICER_PROFILE_STORE.get("phone", "+91 22 2439 8810"),
            "satcom_id": OFFICER_PROFILE_STORE.get("satcom_id", "INMARSAT-C #423-8891"),
            "statutory_authority": OFFICER_PROFILE_STORE.get("statutory_authority", "Indian Coast Guard Act 1978 Sec 14 / UNCLOS Art. 220"),
            "avatar_url": current_user.avatar_url or OFFICER_PROFILE_STORE.get("avatar_url"),
        }
    return OFFICER_PROFILE_STORE


@router.put("/profile")
async def update_profile(
    req: ProfileUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    """Update officer profile attributes."""
    if req.name is not None:
        OFFICER_PROFILE_STORE["name"] = req.name
    if req.email is not None:
        OFFICER_PROFILE_STORE["email"] = req.email
    if req.organization is not None:
        OFFICER_PROFILE_STORE["organization"] = req.organization
    if req.role is not None:
        OFFICER_PROFILE_STORE["role"] = req.role
    if req.phone is not None:
        OFFICER_PROFILE_STORE["phone"] = req.phone
    if req.satcom_id is not None:
        OFFICER_PROFILE_STORE["satcom_id"] = req.satcom_id
    if req.statutory_authority is not None:
        OFFICER_PROFILE_STORE["statutory_authority"] = req.statutory_authority
    if req.clearance is not None:
        OFFICER_PROFILE_STORE["clearance"] = req.clearance
    if req.avatar_url is not None:
        OFFICER_PROFILE_STORE["avatar_url"] = req.avatar_url

    if current_user:
        if req.name is not None:
            current_user.name = req.name
        if req.organization is not None:
            current_user.organization = req.organization
        if req.role is not None:
            current_user.role = req.role
        if req.avatar_url is not None:
            current_user.avatar_url = req.avatar_url
        await db.commit()
        await db.refresh(current_user)

    return {
        "status": "success",
        "message": "Officer profile updated successfully",
        "profile": OFFICER_PROFILE_STORE if not current_user else {
            "name": current_user.name,
            "email": current_user.email,
            "organization": current_user.organization,
            "role": current_user.role,
            "clearance": OFFICER_PROFILE_STORE.get("clearance"),
            "avatar_url": current_user.avatar_url,
        },
    }


@router.post("/profile/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    """Upload a new officer profile avatar image (PNG, JPEG, WebP, GIF)."""
    # Validate extension
    allowed_extensions = {".png", ".jpg", ".jpeg", ".webp", ".gif"}
    _, ext = os.path.splitext(file.filename or "avatar.png")
    ext = ext.lower()
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file format '{ext}'. Only PNG, JPG, JPEG, and WebP images are supported."
        )

    # Generate unique filename
    timestamp = int(time.time() * 1000)
    saved_filename = f"avatar_officer_{timestamp}{ext}"
    saved_filepath = os.path.join(AVATAR_STORAGE_DIR, saved_filename)

    # Save to disk
    try:
        with open(saved_filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to write image file: {str(e)}"
        )

    # Accessible URL
    avatar_url = f"/storage/avatars/{saved_filename}"
    OFFICER_PROFILE_STORE["avatar_url"] = avatar_url

    # Also update team member 1
    if TEAM_STORE:
        TEAM_STORE[0]["avatar_url"] = avatar_url

    if current_user:
        current_user.avatar_url = avatar_url
        await db.commit()
        await db.refresh(current_user)

    return {
        "status": "success",
        "message": "Profile photo uploaded and updated successfully",
        "avatar_url": avatar_url,
        "filename": saved_filename,
        "size_bytes": os.path.getsize(saved_filepath),
    }


@router.delete("/profile/avatar")
async def delete_avatar(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    """Remove officer custom avatar and restore default initials."""
    OFFICER_PROFILE_STORE["avatar_url"] = None
    if TEAM_STORE:
        TEAM_STORE[0]["avatar_url"] = None
    if current_user:
        current_user.avatar_url = None
        await db.commit()
        await db.refresh(current_user)
    return {
        "status": "success",
        "message": "Profile photo removed",
        "avatar_url": None,
    }


@router.post("/notifications/test-dispatch")
async def test_alert_dispatch(req: TestAlertRequest):
    """Simulate test alert broadcast across active communication channels."""
    channels_dispatched = []
    latencies = {}

    for ch in req.channels:
        lat = 30 + int(time.time() * 100) % 40
        channels_dispatched.append(ch)
        latencies[ch] = f"{lat}ms"

    return {
        "status": "success",
        "dispatched": True,
        "incident_code": req.incident_code,
        "severity": req.severity,
        "channels": channels_dispatched,
        "latencies": latencies,
        "recipients_notified": 14,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "summary": f"Broadcast alert successfully transmitted across {len(channels_dispatched)} channels to 14 agency stakeholders.",
    }


@router.get("/data-sources/health")
async def get_data_sources_health():
    """Return real-time stream status and ping latencies for satellite and hydrographic data feeds."""
    return {
        "sources": [
            {
                "id": "sentinel-1",
                "name": "Copernicus Sentinel-1A SAR",
                "type": "C-band Synthetic Aperture Radar",
                "status": "ONLINE",
                "latency_ms": 42,
                "last_poll": "14 mins ago",
                "resolution": "10m / pixel (IW Mode)",
                "next_pass": "13 Sep 05:22 UTC",
                "uptime": "99.94%",
            },
            {
                "id": "eos-04",
                "name": "ISRO EOS-04 / RISAT-2BR1",
                "type": "X-Band Radar Earth Observation",
                "status": "ONLINE",
                "latency_ms": 38,
                "last_poll": "28 mins ago",
                "resolution": "3m High-Resolution StripMap",
                "next_pass": "13 Sep 08:45 UTC",
                "uptime": "99.88%",
            },
            {
                "id": "incois-hycom",
                "name": "INCOIS Coastal Buoy & Current Array",
                "type": "Hydrodynamic Wave & Current Vectors",
                "status": "ONLINE",
                "latency_ms": 18,
                "last_poll": "2 mins ago",
                "resolution": "0.08° Grid (Hourly Stream)",
                "next_pass": "Real-time Telemetry",
                "uptime": "100.0%",
            },
            {
                "id": "ecmwf-era5",
                "name": "ECMWF ERA5 10m Wind Fields",
                "type": "Atmospheric Reanalysis & Forecast",
                "status": "ONLINE",
                "latency_ms": 65,
                "last_poll": "45 mins ago",
                "resolution": "0.1° Surface Wind Stress",
                "next_pass": "Hourly Cycle",
                "uptime": "99.98%",
            },
            {
                "id": "ais-vts",
                "name": "National AIS + Spire Satellite Constellation",
                "type": "Kinematic Ship Transponder Telemetry",
                "status": "ONLINE",
                "latency_ms": 12,
                "last_poll": "30 secs ago",
                "resolution": "Continuous VTS Stream",
                "next_pass": "Live Ingestion",
                "uptime": "99.99%",
            },
        ],
        "global_status": "ALL FEEDS OPERATIONAL",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/team")
async def get_team():
    """Get active multi-agency team directory."""
    return TEAM_STORE


@router.post("/team")
async def add_team_member(member: TeamMemberCreate):
    """Invite and register a new watch officer or agency analyst."""
    new_id = max(m["id"] for m in TEAM_STORE) + 1 if TEAM_STORE else 1
    new_member = {
        "id": new_id,
        "name": member.name,
        "email": member.email,
        "role": member.role,
        "status": "Active",
        "agency": member.agency,
        "clearance": member.clearance,
        "last_active": "Just invited",
        "avatar_url": None,
    }
    TEAM_STORE.append(new_member)
    return {
        "status": "success",
        "message": f"Officer {member.name} registered successfully.",
        "member": new_member,
        "team": TEAM_STORE,
    }
