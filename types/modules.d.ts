// Type declarations for packages that aren't properly resolved by pnpm

// Script dependencies
declare module 'pg' {
  export interface Client {
    connect(): Promise<void>;
    query(sql: string): Promise<{ rows: unknown[] }>;
    end(): Promise<void>;
  }
  export { Client as default };
}

declare module 'pdf-parse' {
  export default function pdfParse(buffer: Buffer): Promise<{ text: string }>;
}

declare module '@expo/vector-icons' {
  import { ComponentType } from 'react';
  import { TextProps } from 'react-native';

  export interface IconProps extends TextProps {
    name: string;
    size?: number;
    color?: string;
  }

  export const Ionicons: ComponentType<IconProps>;
  export const FontAwesome: ComponentType<IconProps>;
  export const MaterialIcons: ComponentType<IconProps>;
  export const MaterialCommunityIcons: ComponentType<IconProps>;
  export const Feather: ComponentType<IconProps>;
  export const AntDesign: ComponentType<IconProps>;
  export const Entypo: ComponentType<IconProps>;
  export const EvilIcons: ComponentType<IconProps>;
  export const FontAwesome5: ComponentType<IconProps>;
  export const FontAwesome6: ComponentType<IconProps>;
  export const Fontisto: ComponentType<IconProps>;
  export const Foundation: ComponentType<IconProps>;
  export const Octicons: ComponentType<IconProps>;
  export const SimpleLineIcons: ComponentType<IconProps>;
  export const Zocial: ComponentType<IconProps>;
}

declare module '@react-navigation/bottom-tabs' {
  import { ComponentType, ReactNode } from 'react';
  import { ViewStyle, TextStyle } from 'react-native';
  import { NavigationProp, RouteProp, ParamListBase } from '@react-navigation/native';

  export type BottomTabNavigationOptions = {
    title?: string;
    tabBarLabel?: string | ((props: { focused: boolean; color: string; position: 'beside-icon' | 'below-icon' }) => ReactNode);
    tabBarIcon?: (props: { focused: boolean; color: string; size: number }) => ReactNode;
    tabBarBadge?: string | number;
    tabBarBadgeStyle?: TextStyle;
    tabBarAccessibilityLabel?: string;
    tabBarTestID?: string;
    tabBarVisible?: boolean;
    tabBarStyle?: ViewStyle;
    tabBarLabelStyle?: TextStyle;
    tabBarIconStyle?: ViewStyle;
    tabBarItemStyle?: ViewStyle;
    tabBarActiveTintColor?: string;
    tabBarInactiveTintColor?: string;
    tabBarActiveBackgroundColor?: string;
    tabBarInactiveBackgroundColor?: string;
    tabBarShowLabel?: boolean;
    tabBarHideOnKeyboard?: boolean;
    headerShown?: boolean;
  };

  export type BottomTabBarProps = {
    state: {
      routes: Array<{ key: string; name: string; params?: object }>;
      index: number;
    };
    navigation: NavigationProp<ParamListBase>;
    descriptors: Record<string, { options: BottomTabNavigationOptions }>;
    insets: { top: number; right: number; bottom: number; left: number };
  };

  export function createBottomTabNavigator<T extends ParamListBase = ParamListBase>(): {
    Navigator: ComponentType<{
      children?: ReactNode;
      screenOptions?: BottomTabNavigationOptions | ((props: { route: RouteProp<T, keyof T>; navigation: NavigationProp<T> }) => BottomTabNavigationOptions);
      initialRouteName?: keyof T;
      backBehavior?: 'firstRoute' | 'initialRoute' | 'order' | 'history' | 'none';
      detachInactiveScreens?: boolean;
      sceneContainerStyle?: ViewStyle;
    }>;
    Screen: ComponentType<{
      name: keyof T;
      component?: ComponentType<any>;
      options?: BottomTabNavigationOptions;
      initialParams?: object;
      getId?: (props: { params: object }) => string | undefined;
      listeners?: object;
    }>;
  };
}
