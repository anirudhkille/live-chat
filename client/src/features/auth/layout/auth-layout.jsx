import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AuthLayout({title,description,children}){
    return <div className="flex justify-center items-center h-dvh">
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
             {children}
            </CardContent>
          </Card>
        </div>
}