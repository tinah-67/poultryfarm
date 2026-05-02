package com.poultryapp

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class LocalNotificationModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "LocalNotificationModule"

  @ReactMethod
  fun createChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return
    }

    val channel = NotificationChannel(
      CHANNEL_ID,
      "Farm Alerts",
      NotificationManager.IMPORTANCE_DEFAULT
    ).apply {
      description = "Offline poultry farm notifications"
    }

    val notificationManager =
      reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

    notificationManager.createNotificationChannel(channel)
  }

  @ReactMethod
  fun showNotification(notificationKey: String, title: String, message: String, userId: Double) {
    val launchIntent =
      reactContext.packageManager.getLaunchIntentForPackage(reactContext.packageName)
        ?: Intent(reactContext, MainActivity::class.java)

    launchIntent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
    launchIntent.putExtra(EXTRA_OPEN_NOTIFICATIONS, true)
    launchIntent.putExtra(EXTRA_NOTIFICATION_USER_ID, userId.toInt())

    val pendingIntent = PendingIntent.getActivity(
      reactContext,
      notificationKey.hashCode(),
      launchIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    val notification = NotificationCompat.Builder(reactContext, CHANNEL_ID)
      .setSmallIcon(R.mipmap.ic_launcher)
      .setContentTitle(title)
      .setContentText(message)
      .setStyle(NotificationCompat.BigTextStyle().bigText(message))
      .setPriority(NotificationCompat.PRIORITY_DEFAULT)
      .setAutoCancel(true)
      .setContentIntent(pendingIntent)
      .build()

    NotificationManagerCompat.from(reactContext).notify(notificationKey.hashCode(), notification)
  }

  @ReactMethod
  fun consumeNotificationOpen(promise: Promise) {
    val activity = getCurrentActivity() ?: reactContext.currentActivity
    val intent = activity?.intent
    val shouldOpenNotifications = intent?.getBooleanExtra(EXTRA_OPEN_NOTIFICATIONS, false) == true
    val notificationUserId = intent?.getIntExtra(EXTRA_NOTIFICATION_USER_ID, 0) ?: 0

    if (shouldOpenNotifications) {
      intent?.removeExtra(EXTRA_OPEN_NOTIFICATIONS)
      intent?.removeExtra(EXTRA_NOTIFICATION_USER_ID)
    }

    val result = Arguments.createMap()
    result.putBoolean("shouldOpenNotifications", shouldOpenNotifications)
    result.putInt("userId", notificationUserId)

    promise.resolve(result)
  }

  companion object {
    private const val CHANNEL_ID = "farm_alerts"
    private const val EXTRA_OPEN_NOTIFICATIONS = "open_notifications"
    private const val EXTRA_NOTIFICATION_USER_ID = "notification_user_id"
  }
}
