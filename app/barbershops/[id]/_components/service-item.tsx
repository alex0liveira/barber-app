"use client";

import { Button } from "@/app/_components/ui/button";
import { Calendar } from "@/app/_components/ui/calendar";
import { Card, CardContent } from "@/app/_components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/app/_components/ui/sheet";
import { Barbershop, Booking, Service } from "@prisma/client";
import { ptBR } from "date-fns/locale/pt-BR";
import { signIn, useSession } from "next-auth/react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { generateDayTimeList } from "../_helpers/hours";
import { format, setHours, setMinutes } from "date-fns";
import { saveBooking } from "../../_actions/save_booking";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { getDayBookings } from "../../_actions/get-day-bookings";

interface ServiceItemProps {
  barbershop: Barbershop;
  service: Service;
  isAuthenticated: boolean;
}

const ServiceItem = ({
  service,
  barbershop,
  isAuthenticated,
}: ServiceItemProps) => {
  const router = useRouter();

  const { data } = useSession();

  const [date, setDate] = useState<Date | undefined>(undefined);
  const [hour, setHour] = useState<String | undefined>();
  const [submitIsLoading, setSubmitIsLoading] = useState(false);
  const [sheetIsOpen, setSheetIsOpen] = useState(false);
  const [dayBookings, setDayBookings] = useState<Booking[]>([]);

  const handleHourClick = (time: string) => {
    setHour(time);
  };

  useEffect(() => {
    if (!date) {
      return;
    }
    const refreshAvailableHours = async () => {
      const _dayBookings = await getDayBookings(barbershop.id, date);

      setDayBookings(_dayBookings);
    };

    refreshAvailableHours();
  }, [date, barbershop.id]);

  const handleDateClick = (date: Date | undefined) => {
    setDate(date);
    setHour(undefined);
  };

  const handleBookingClick = () => {
    if (!isAuthenticated) {
      return signIn("google");
    }
  };

  const handleBookingSubmit = async () => {
    setSubmitIsLoading(true);
    try {
      if (!hour || !date || !data?.user) {
        return;
      }

      const dateHour = Number(hour.split(":")[0]);
      const dateMinutes = Number(hour.split(":")[1]);

      const newDate = setMinutes(setHours(date, dateHour), dateMinutes);

      await saveBooking({
        serviceId: service.id,
        barbershopId: barbershop.id,
        date: newDate,
        userId: (data.user as any).id,
      });

      setSheetIsOpen(false);
      setHour(undefined);
      setDate(undefined);
      toast("Reserva feita com sucesso!", {
        description: format(newDate, "'Para' dd 'de' MMMM 'às' HH':'mm'.'", {
          locale: ptBR,
        }),
        action: {
          label: "Visualizar",
          onClick: () => router.push("/bookings"),
        },
      });
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitIsLoading(false);
    }
  };

  const timeList = useMemo(() => {
    if (!date) {
      return [];
    }
    return generateDayTimeList(date).filter((time) => {
      const timeHour = Number(time.split(":")[0]);
      const timeMinutes = Number(time.split(":")[1]);

      const booking = dayBookings.find((booking) => {
        const bookingHour = booking.date.getHours();
        const bookingMinutes = booking.date.getMinutes();

        return bookingHour === timeHour && bookingMinutes === timeMinutes;
      });
      if (!booking) {
        return true;
      }
      return false;
    });
  }, [date, dayBookings]);

  return (
    <Card>
      <CardContent className="flex flex-row p-3 gap-4 items-center w-full">
        <div className="relative min-h-[110px] min-w-[110px] max-h-[110px]">
          <Image
            className="rounded-lg"
            src={service.imageUrl}
            fill
            style={{ objectFit: "contain" }}
            alt={service.name}
          />
        </div>

        <div className="flex flex-col w-full">
          <h2 className="font-bold">{service.name}</h2>
          <p className="text-sm text-gray-400">{service.description}</p>
          <div className="flex items-center justify-between mt-3">
            <p className="text-primary text-sm font-bold">
              {Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(Number(service.price))}
            </p>

            <Sheet open={sheetIsOpen} onOpenChange={setSheetIsOpen}>
              <SheetTrigger asChild>
                <Button variant="secondary" onClick={handleBookingClick}>
                  Reservar
                </Button>
              </SheetTrigger>

              <SheetContent className="p-0">
                <SheetHeader className="text-left px-5 py-6 border-b border-solid border-secondary">
                  <SheetTitle>Fazer Reserva</SheetTitle>
                </SheetHeader>

                <div className="py-6">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={handleDateClick}
                    locale={ptBR}
                    fromDate={new Date()}
                    styles={{
                      head_cell: {
                        width: "100%",
                        textTransform: "capitalize",
                      },
                      cell: {
                        width: "100%",
                      },
                      button: {
                        width: "100%",
                      },
                      nav_button_previous: {
                        width: "32px",
                        height: "32px",
                      },
                      nav_button_next: {
                        width: "32px",
                        height: "32px",
                      },
                      caption: {
                        textTransform: "capitalize",
                      },
                    }}
                  />
                </div>

                {date && (
                  <div className="flex gap-3 overflow-x-auto py-6 px-5 border-t border-solid border-secondary [&::-webkit-scrollbar]:hidden">
                    {timeList.map((time) => (
                      <Button
                        onClick={() => handleHourClick(time)}
                        variant={hour === time ? "default" : "outline"}
                        className="rounded-full"
                        key={time}
                      >
                        {time}
                      </Button>
                    ))}
                  </div>
                )}

                <div className="py-6 px-5 border-t border-solid border-secondary">
                  <Card>
                    <CardContent className="p-3 gap-3 flex flex-col">
                      <div className="flex justify-between">
                        <h2 className="font-bold">{service.name}</h2>
                        <h3 className="font-bold text-sm">
                          {" "}
                          {Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }).format(Number(service.price))}
                        </h3>
                      </div>
                      {date && (
                        <div className="flex justify-between">
                          <h3 className="text-grey-400">Data</h3>
                          <h4 className="text-sm">
                            {format(date, "dd 'de' MMMM", {
                              locale: ptBR,
                            })}
                          </h4>
                        </div>
                      )}
                      {hour && (
                        <div className="flex justify-between">
                          <h3 className="text-grey-400">Horário</h3>
                          <h4 className="text-sm">{hour}</h4>
                        </div>
                      )}

                      <div className="flex justify-between">
                        <h3 className="text-grey-400">Barbearia</h3>
                        <h4 className="text-sm">{barbershop.name}</h4>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <SheetFooter className="px-5">
                  <Button
                    onClick={handleBookingSubmit}
                    disabled={!hour || !date || submitIsLoading}
                  >
                    {submitIsLoading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Confirmar Reservar
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ServiceItem;
