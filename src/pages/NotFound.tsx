
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center">
      <div className="glass-container max-w-md">
        <h1 className="text-3xl font-bold mb-4">404</h1>
        <p className="text-xl text-foreground/80 mb-6">Page not found</p>
        <Button className="glass-button" asChild>
          <Link to="/">Return to Home</Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
