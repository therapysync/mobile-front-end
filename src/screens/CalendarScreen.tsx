import { useEffect, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
} from "react-native";
import { Calendar, LocaleConfig } from "react-native-calendars";
import { Colors } from "../constants/colors";
import { format, set } from "date-fns";
import { MaterialIcons } from "@expo/vector-icons";
import Entypo from "@expo/vector-icons/Entypo";
import { ru } from "date-fns/locale";
import CustomButton from "../components/CustomButton";
import AddRecordScreen from "./AddRecordScreen";
import Task from "../components/Task";
import ClientTask from "../components/ClientTask";

import {
  getClientAppointments,
  getPsychologistAppointments,
} from "../services/appointment";
import { getClientsByPsychologist } from "../services/client";
import { Appointment, Client, User } from "../types";
import { getUser } from "../services/auth";

LocaleConfig.locales["ru"] = {
  monthNames: [
    "Январь",
    "Февраль",
    "Март",
    "Апрель",
    "Май",
    "Июнь",
    "Июль",
    "Август",
    "Сентябрь",
    "Октябрь",
    "Ноябрь",
    "Декабрь",
  ],
  monthNamesShort: [
    "Янв",
    "Фев",
    "Мар",
    "Апр",
    "Май",
    "Июн",
    "Июл",
    "Авг",
    "Сен",
    "Окт",
    "Ноя",
    "Дек",
  ],
  dayNames: [
    "Воскресенье",
    "Понедельник",
    "Вторник",
    "Среда",
    "Четверг",
    "Пятница",
    "Суббота",
  ],
  dayNamesShort: ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"],
  today: "Сегодня",
};

LocaleConfig.defaultLocale = "ru";

export default function CalendarScreen() {
  const today = format(new Date(), "yyyy-MM-dd");
  const [clientsMap, setClientsMap] = useState<{ [id: number]: string }>({});
  const [selected, setSelected] = useState(today);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isRecordActive, setRecordActive] = useState<boolean>(false);
  const [user, setUser] = useState<User>();
  const [isClient, setIsClient] = useState(true);

  const fetchClients = async () => {
    try {
      const user = await getUser();
      if (user) {
        setUser(user);
        setIsClient(user.role === "CLIENT");
      }

      const clients = await getClientsByPsychologist();
      const map: { [id: number]: string } = {};
      clients.forEach((client) => {
        map[client.id] = `${client.firstName} ${client.lastName}`;
      });
      setClientsMap(map);
    } catch (error) {
      console.error("Ошибка при получении клиентов:", error);
    }
  };

  const fetchAppointments = async () => {
    try {
      const data = isClient
        ? await getClientAppointments()
        : await getPsychologistAppointments();
      setAppointments(data);
    } catch (error) {
      console.error("Ошибка при получении записей:", error);
    }
  };

  useEffect(() => {
    fetchAppointments();
    if (!isClient) fetchClients();
  }, []);

  const handleAddRecord = () => {
    setRecordActive(true);
  };

  const confirmAddRecord = () => {
    fetchAppointments();
    setRecordActive(false);
  };

  const cancelAddRecord = () => {
    setRecordActive(false);
  };

  const appointmentsForSelectedDate = appointments
    .filter((appointment) => appointment.date === selected)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <>
      {isRecordActive ? (
        <AddRecordScreen
          selectedDate={format(new Date(selected), "yyyy-MM-dd", {
            locale: ru,
          })}
          confirmAddRecord={confirmAddRecord}
          cancelAddRecord={cancelAddRecord}
        />
      ) : (
        <ImageBackground
          style={styles.container}
          source={require("../assets/background.png")}
        >
          <Calendar
            style={{ borderRadius: 20, paddingBottom: 10 }}
            markedDates={{
              [selected]: {
                selected: true,
                disableTouchEvent: true,
                selectedColor: "white",
                selectedTextColor: Colors.primary,
                customStyles: {
                  container: {
                    borderWidth: 1,
                    borderColor: Colors.primary,
                    borderRadius: 16,
                  },
                  text: {
                    color: Colors.primary,
                  },
                },
              },
              [today]: {
                customStyles: {
                  container:
                    selected == today
                      ? {
                          borderWidth: 1,
                          borderColor: Colors.primary,
                          borderRadius: 16,
                        }
                      : {},
                  text: {
                    color: Colors.primary,
                  },
                },
              },
            }}
            renderArrow={(direction) =>
              direction === "left" ? (
                <MaterialIcons
                  name="arrow-left"
                  size={24}
                  color={Colors.icon}
                />
              ) : (
                <MaterialIcons
                  name="arrow-right"
                  size={24}
                  color={Colors.icon}
                />
              )
            }
            markingType="custom"
            onDayPress={(day) => {
              setSelected(day.dateString);
            }}
            firstDay={1}
            enableSwipeMonths={true}
          />

          <View style={styles.modal}>
            <View style={styles.date}>
              {selected === today ? (
                <Text style={{ fontSize: 20, marginRight: 14 }}>Сегодня</Text>
              ) : (
                <></>
              )}
              <Text style={{ fontSize: 15 }}>
                {format(new Date(selected), "d MMMM", { locale: ru })}
              </Text>
            </View>
            <ScrollView style={{ marginTop: 12 }}>
              {appointmentsForSelectedDate.length > 0 ? (
                appointmentsForSelectedDate.map((appt) =>
                  isClient ? (
                    <ClientTask
                      key={appt.id}
                      title={`Запись в ${appt.startTime}`}
                      complete={true}
                    />
                  ) : (
                    <Task
                      key={appt.id}
                      title={`С клиентом ${clientsMap[appt.clientId]}`}
                      complete={
                        new Date(`${appt.date}T${appt.endTime}`) < new Date()
                      }
                      startTime={new Date(`${appt.date}T${appt.startTime}`)}
                      endTime={new Date(`${appt.date}T${appt.endTime}`)}
                    />
                  )
                )
              ) : (
                <Text style={{ textAlign: "center", marginTop: 10 }}>
                  Нет записей на выбранную дату
                </Text>
              )}
            </ScrollView>

            {!isClient && (
              <CustomButton
                title="Добавить запись"
                backgroundColorProp={Colors.lightPrimary}
                onClick={handleAddRecord}
              />
            )}
          </View>
        </ImageBackground>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: Colors.lightContainerBackground,
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  info: {
    marginTop: 20,
    textAlign: "center",
    fontSize: 16,
  },
  modal: {
    // backgroundColor: Colors.containerBackground,
    backgroundColor: "white",
    gap: 22,
    padding: 20,
    paddingBottom: 40,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  date: {
    flexDirection: "row",
    alignItems: "baseline",
  },
});
