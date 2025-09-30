
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

function Landing() {
  return (
    <div className="relative">
      <div
        className="flex flex-col items-center justify-center min-h-screen bg-cover bg-center"
        style={{ backgroundImage: `url('/images/10-1.jpg')` }}
      >
        <Card className="mb-8 p-6 bg-card bg-opacity-80 backdrop-blur-sm shadow-xl border-none">
          <CardContent className="p-0">
            <h1 className="text-center text-5xl font-extrabold tracking-tight text-foreground sm:text-6xl lg:text-7xl drop-shadow-lg leading-tight">
              Welcome to Gitzzeria
            </h1>
          </CardContent>
        </Card>

        <div className="flex flex-col space-y-4 mt-8">
          <Link to="/auth">
            <Button
              variant="ghost"
              className="w-64 py-6 text-xl font-semibold hover:bg-primary-foreground hover:text-primary transition-colors duration-200"
            >
              Login / Sign Up
            </Button>
          </Link>
          <Link to="/adminlogin">
            <Button
              variant="ghost"
              className="w-64 py-6 text-xl font-semibold hover:bg-primary-foreground hover:text-primary transition-colors duration-200"
            >
              Admin Login
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Landing;