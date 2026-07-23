import doctorImg from "../assets/doctor-avatar.png";

const DoctorAvatar = () => {
  return (
    <div className="relative flex items-center justify-center avatar-float">
      <div className="absolute w-64 h-64 rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute w-48 h-48 rounded-full bg-primary/10 blur-2xl" />
      <img
        src={doctorImg}
        alt="AI Doctor Avatar"
        className="relative z-10 w-56 h-auto drop-shadow-2xl rounded-b-3xl"
      />
    </div>
  );
};

export default DoctorAvatar;
